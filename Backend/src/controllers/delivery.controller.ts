import type { Response } from "express";
import { Order, type OrderDocument } from "../models/Order";
import { User } from "../models/User";
import { DeliveryPartner, type DeliveryPartnerDocument } from "../models/DeliveryPartner";
import { success } from "../utils/response";
import { getDeliverySettings, indiaToday } from "../services/deliverySettings.service";
import {
  ACTIVE_STATUSES,
  FAIL_REASONS,
  acceptDelivery,
  completeDelivery,
  declineDelivery,
  expireStaleAssignments,
  failDelivery,
  partnerForUser,
  partnerStats,
  pickUpDelivery,
  pickupPoints,
} from "../services/delivery.service";
import type { AuthRequest } from "../middleware/auth.middleware";

const HISTORY_LIMIT = 100;

function mapsLink(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** A delivery as the partner sees it. Customer contact details only while it's their active job. */
async function toJob(order: OrderDocument, partner: DeliveryPartnerDocument) {
  const d = order.delivery!;
  const mine = !!d.partner?.equals(partner._id);
  const active = mine && ACTIVE_STATUSES.includes(order.status);
  const a = order.shippingAddress;
  const fullAddress = [a.address, a.village, a.district, a.state, a.pincode].filter(Boolean).join(", ");
  const myAttempts = d.attempts.filter((t) => t.partner?.equals(partner._id));
  return {
    id: order.orderNumber,
    status: order.status,
    date: order.createdAt,
    total: order.total,
    paymentMethod: order.paymentMethod,
    itemsCount: order.items.reduce((s, i) => s + i.quantity, 0),
    active,
    assignedAt: mine ? d.assignedAt : undefined,
    acceptedAt: mine ? d.acceptedAt : undefined,
    pickedUpAt: mine ? d.pickedUpAt : undefined,
    deliveredAt: mine ? order.deliveredAt : undefined,
    cashCollected: mine ? d.cashCollected : undefined,
    fee: mine ? d.fee : undefined,
    lastProblem: active && d.needsAttention === "failed" ? myAttempts.at(-1)?.reason : undefined,
    attempts: myAttempts.map((t) => ({ kind: t.kind, at: t.at, reason: t.reason, fee: t.fee })),
    customer: active
      ? { name: a.fullName, phone: a.mobile, address: fullAddress, pincode: a.pincode, mapsUrl: mapsLink(fullAddress) }
      : { name: a.fullName.split(" ")[0], area: [a.village, a.pincode].filter(Boolean).join(" "), pincode: a.pincode },
    pickups: active ? await pickupPoints(order) : undefined,
  };
}

/** The partner's profile, earnings and today's availability. */
export async function getMe(req: AuthRequest, res: Response) {
  const partner = await DeliveryPartner.findOne({ user: req.userId });
  const user = await User.findById(req.userId).select("name email phone");
  if (!partner || !user) {
    return success(res, "No delivery profile", { partner: null });
  }
  const [stats, settings] = await Promise.all([partnerStats([partner._id]), getDeliverySettings()]);
  const s = stats.get(partner._id.toString())!;
  success(res, "Delivery profile fetched", {
    partner: {
      id: partner._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      vehicle: partner.vehicle,
      serviceAreas: partner.serviceAreas,
      availableToday: partner.availableOn === indiaToday(),
      isActive: partner.isActive,
    },
    stats: {
      active: s.active,
      deliveredTotal: s.deliveredTotal,
      successRate: s.successRate,
      feesEarned: s.feesEarned,
      feesPaid: s.feesPaid,
      unpaidFees: Math.max(0, Math.round((s.feesEarned - s.feesPaid) * 100) / 100),
      cashInHand: s.cashInHand,
      owes: s.owes,
    },
    rates: { feePerDelivery: settings.feePerDelivery, extraPickupFee: settings.extraPickupFee },
    failReasons: FAIL_REASONS,
  });
}

export async function setAvailability(req: AuthRequest, res: Response) {
  const partner = await partnerForUser(req.userId!);
  const available = req.body.available === true;
  await DeliveryPartner.updateOne(
    { _id: partner._id },
    available ? { $set: { availableOn: indiaToday() } } : { $unset: { availableOn: 1 } }
  );
  success(res, available ? "You're available for deliveries today." : "You're off for today.", { availableToday: available });
}

/** Active jobs (with customer details) and history. */
export async function listJobs(req: AuthRequest, res: Response) {
  const partner = await partnerForUser(req.userId!);
  await expireStaleAssignments();
  const [activeOrders, past] = await Promise.all([
    Order.find({ "delivery.partner": partner._id, status: { $in: ACTIVE_STATUSES } }).sort({ "delivery.assignedAt": 1 }),
    Order.find({
      $or: [
        { "delivery.partner": partner._id, status: { $nin: ACTIVE_STATUSES } },
        { "delivery.attempts.partner": partner._id },
      ],
    })
      .sort({ updatedAt: -1 })
      .limit(HISTORY_LIMIT),
  ]);
  const activeIds = new Set(activeOrders.map((o) => o.orderNumber));
  success(res, "Deliveries fetched", {
    active: await Promise.all(activeOrders.map((o) => toJob(o, partner))),
    history: await Promise.all(past.filter((o) => !activeIds.has(o.orderNumber)).map((o) => toJob(o, partner))),
  });
}

async function respondWithJob(req: AuthRequest, res: Response, message: string) {
  const partner = await partnerForUser(req.userId!);
  const order = await Order.findOne({ orderNumber: req.params.orderNumber });
  success(res, message, { job: order ? await toJob(order, partner) : null });
}

export async function accept(req: AuthRequest, res: Response) {
  await acceptDelivery(await partnerForUser(req.userId!), String(req.params.orderNumber));
  await respondWithJob(req, res, "Delivery accepted");
}

export async function decline(req: AuthRequest, res: Response) {
  await declineDelivery(await partnerForUser(req.userId!), String(req.params.orderNumber), req.body.reason);
  success(res, "Delivery declined. The team will reassign it.");
}

export async function pickUp(req: AuthRequest, res: Response) {
  await pickUpDelivery(await partnerForUser(req.userId!), String(req.params.orderNumber));
  await respondWithJob(req, res, "Picked up. The customer has been told it's on the way.");
}

export async function deliver(req: AuthRequest, res: Response) {
  await completeDelivery(await partnerForUser(req.userId!), String(req.params.orderNumber), {
    code: req.body.code,
    cashCollected: req.body.cashCollected,
  });
  await respondWithJob(req, res, "Delivered. Thank you!");
}

export async function fail(req: AuthRequest, res: Response) {
  await failDelivery(await partnerForUser(req.userId!), String(req.params.orderNumber), req.body.reason, req.body.note);
  await respondWithJob(req, res, "Noted. The team has been told and will arrange what happens next.");
}
