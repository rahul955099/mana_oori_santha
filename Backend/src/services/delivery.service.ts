import { Types } from "mongoose";
import { Order, type OrderDocument, type OrderStatus } from "../models/Order";
import { DeliveryPartner, type DeliveryPartnerDocument } from "../models/DeliveryPartner";
import { PartnerSettlement } from "../models/PartnerSettlement";
import { Seller } from "../models/Seller";
import type { UserDocument } from "../models/User";
import { AppError } from "../utils/AppError";
import { commitStatus, deliveredFields } from "./order.service";
import { getDeliverySettings, indiaToday } from "./deliverySettings.service";
import { notifyAdmins, notifyUser } from "./notification.service";
import { deliveryAssignedEmail } from "./emailTemplates";

/** Statuses in which an order is still a partner's job. */
export const ACTIVE_STATUSES: OrderStatus[] = ["confirmed", "packed", "out-for-delivery"];
/** Statuses in which an order can be given to a partner. */
const ASSIGNABLE: OrderStatus[] = ["confirmed", "packed"];
const DAY_MS = 24 * 60 * 60 * 1000;

type PartnerWithUser = DeliveryPartnerDocument & { user: Pick<UserDocument, "_id" | "name" | "email" | "phone" | "isActive"> };

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export interface PartnerStats {
  active: number;
  delivered30: number;
  problems30: number;
  /** Share of the last 30 days' jobs that were delivered (null when there were none). */
  successRate: number | null;
  deliveredTotal: number;
  cashCollected: number;
  feesEarned: number;
  cashReceived: number;
  feesPaid: number;
  /** Cash collected from customers and not yet handed over. */
  cashInHand: number;
  /** Positive: the partner owes the business. Negative: the business owes the partner. */
  owes: number;
}

/** Work and money figures for each partner, from orders and recorded settlements. */
export async function partnerStats(partnerIds: Types.ObjectId[]): Promise<Map<string, PartnerStats>> {
  const since = new Date(Date.now() - 30 * DAY_MS);
  const [orders, settlements] = await Promise.all([
    Order.find({ $or: [{ "delivery.partner": { $in: partnerIds } }, { "delivery.attempts.partner": { $in: partnerIds } }] }).select(
      "status deliveredAt delivery"
    ),
    PartnerSettlement.find({ partner: { $in: partnerIds } }).select("partner kind amount"),
  ]);

  const stats = new Map<string, PartnerStats>();
  const get = (id: string) => {
    if (!stats.has(id)) {
      stats.set(id, {
        active: 0,
        delivered30: 0,
        problems30: 0,
        successRate: null,
        deliveredTotal: 0,
        cashCollected: 0,
        feesEarned: 0,
        cashReceived: 0,
        feesPaid: 0,
        cashInHand: 0,
        owes: 0,
      });
    }
    return stats.get(id)!;
  };
  for (const id of partnerIds) get(id.toString());

  for (const o of orders) {
    const d = o.delivery!;
    const current = d.partner?.toString();
    if (current && stats.has(current)) {
      const s = get(current);
      if (ACTIVE_STATUSES.includes(o.status)) s.active += 1;
      if (d.cashCollected !== undefined) {
        s.deliveredTotal += 1;
        s.cashCollected += d.cashCollected;
        s.feesEarned += d.fee ?? 0;
        if (o.deliveredAt && o.deliveredAt >= since) s.delivered30 += 1;
      }
    }
    for (const a of d.attempts) {
      const id = a.partner?.toString();
      if (!id || !stats.has(id)) continue;
      const s = get(id);
      s.feesEarned += a.fee ?? 0;
      if (a.at >= since) s.problems30 += 1;
    }
  }
  for (const st of settlements) {
    const s = get(st.partner.toString());
    if (st.kind === "cash-received") s.cashReceived += st.amount;
    else s.feesPaid += st.amount;
  }
  for (const s of stats.values()) {
    const jobs = s.delivered30 + s.problems30;
    s.successRate = jobs > 0 ? Math.round((s.delivered30 / jobs) * 100) : null;
    s.cashInHand = round2(s.cashCollected - s.cashReceived);
    s.owes = round2(s.cashCollected - s.cashReceived - s.feesEarned + s.feesPaid);
    s.cashCollected = round2(s.cashCollected);
    s.feesEarned = round2(s.feesEarned);
  }
  return stats;
}

/** Rough weight of an order in kg, from units like "25 kg", "500 g" or "1 litre". */
function orderKg(order: OrderDocument): number {
  let kg = 0;
  for (const i of order.items) {
    const m = i.unit.toLowerCase().match(/([\d.]+)\s*(kg|g|gm|grams?|l|litres?|liters?|ml)\b/);
    if (!m) continue;
    const n = Number(m[1]);
    const unitKg = ["kg", "l", "litre", "litres", "liter", "liters"].includes(m[2]) ? n : n / 1000;
    kg += unitKg * i.quantity;
  }
  return kg;
}

/** Large orders want an auto or van rather than a bike. */
export function isLargeOrder(order: OrderDocument): boolean {
  const pieces = order.items.reduce((s, i) => s + i.quantity, 0);
  return orderKg(order) >= 15 || pieces >= 12;
}

export interface Suggestion {
  partnerId: string;
  name: string;
  phone: string;
  vehicle: string;
  eligible: boolean;
  score: number;
  /** Why they can't be given this order (empty when eligible). */
  blockers: string[];
  /** What counts for or against them. */
  notes: string[];
  isCurrent: boolean;
}

/** Partners ranked for an order: availability, area, load and cash limits rule
 * partners out; same route, light load, reliability and vehicle rank the rest. */
export async function suggestPartners(order: OrderDocument): Promise<Suggestion[]> {
  const [settings, partners] = await Promise.all([
    getDeliverySettings(),
    DeliveryPartner.find().populate<{ user: PartnerWithUser["user"] }>("user", "name email phone isActive"),
  ]);
  const ids = partners.map((p) => p._id);
  const [stats, activeOrders] = await Promise.all([
    partnerStats(ids),
    Order.find({ "delivery.partner": { $in: ids }, status: { $in: ACTIVE_STATUSES }, _id: { $ne: order._id } }).select(
      "delivery.partner shippingAddress.pincode items.seller"
    ),
  ]);

  const today = indiaToday();
  const pincode = order.shippingAddress.pincode;
  const shops = new Set(order.items.map((i) => i.seller.toString()));
  const large = isLargeOrder(order);

  const suggestions = partners.map((p): Suggestion => {
    const s = stats.get(p._id.toString())!;
    const mine = activeOrders.filter((o) => o.delivery?.partner?.equals(p._id));
    const blockers: string[] = [];
    const notes: string[] = [];
    let score = 0;

    if (!p.isActive || !p.user?.isActive) blockers.push("Blocked");
    if (p.availableOn !== today) blockers.push("Not available today");
    if (!p.serviceAreas.includes(pincode)) blockers.push(`Doesn't cover ${pincode}`);
    if (s.active >= settings.maxActiveDeliveries) blockers.push(`At the limit of ${settings.maxActiveDeliveries} active deliveries`);
    if (s.cashInHand > settings.cashLimit) blockers.push(`Holding ₹${s.cashInHand} cash (limit ₹${settings.cashLimit})`);

    if (mine.some((o) => o.shippingAddress.pincode === pincode)) {
      score += 40;
      notes.push(`Already delivering to ${pincode}`);
    }
    if (mine.some((o) => o.items.some((i) => shops.has(i.seller.toString())))) {
      score += 30;
      notes.push("Already picking up from the same shop");
    }
    score -= s.active * 3;
    notes.push(s.active === 0 ? "No active deliveries" : `${s.active} active ${s.active === 1 ? "delivery" : "deliveries"}`);
    if (s.successRate === null) {
      notes.push("New: no deliveries in the last 30 days");
    } else {
      score += s.successRate / 5;
      notes.push(`${s.successRate}% delivered (30 days)`);
    }
    if (large && p.vehicle === "bike") {
      score -= 20;
      notes.push("Large order: a bike may be too small");
    } else if (large) {
      score += 15;
      notes.push(`Large order: has a ${p.vehicle}`);
    }

    return {
      partnerId: p._id.toString(),
      name: p.user?.name ?? "",
      phone: p.user?.phone ?? "",
      vehicle: p.vehicle,
      eligible: blockers.length === 0,
      score: Math.round(score),
      blockers,
      notes,
      isCurrent: !!order.delivery?.partner?.equals(p._id),
    };
  });

  return suggestions.sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || a.name.localeCompare(b.name));
}

async function loadOrder(orderNumber: string) {
  const order = await Order.findOne({ orderNumber });
  if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
  return order;
}

/** Admin: gives one or more orders to a partner. Assigning also switches an order to partner delivery. */
export async function assignOrders(orderNumbers: string[], partnerId: string) {
  const partner = await DeliveryPartner.findById(partnerId).populate<{ user: PartnerWithUser["user"] }>("user", "name email phone isActive");
  if (!partner || !partner.isActive || !partner.user?.isActive) {
    throw new AppError("Choose an active delivery partner.", 400, "PARTNER_INACTIVE");
  }
  const orders = await Order.find({ orderNumber: { $in: orderNumbers } });
  if (orders.length !== new Set(orderNumbers).size) throw new AppError("Order not found", 404, "NOT_FOUND");
  const blocked = orders.find((o) => !ASSIGNABLE.includes(o.status));
  if (blocked) {
    throw new AppError(`${blocked.orderNumber} is "${blocked.status}": only confirmed or packed orders can be assigned.`, 400, "NOT_ASSIGNABLE");
  }

  const now = new Date();
  for (const order of orders) {
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          "delivery.mode": "partner",
          "delivery.partner": partner._id,
          "delivery.partnerName": partner.user.name,
          "delivery.partnerPhone": partner.user.phone,
          "delivery.assignedAt": now,
        },
        $unset: { "delivery.acceptedAt": 1, "delivery.needsAttention": 1 },
      }
    );
  }
  const list = orders.map((o) => o.orderNumber).join(", ");
  await notifyUser(
    partner.user._id,
    {
      type: "order-status",
      title: orders.length === 1 ? `New delivery ${list}` : `${orders.length} new deliveries`,
      message: "Open your deliveries to accept.",
      link: "/delivery",
    },
    { content: deliveryAssignedEmail(partner.user.name, orders.map((o) => o.orderNumber)) }
  );
  return { partnerName: partner.user.name, count: orders.length };
}

/** Admin: takes an order back from its partner (before pickup). */
export async function unassignOrder(orderNumber: string) {
  const order = await loadOrder(orderNumber);
  if (!order.delivery?.partner) throw new AppError("This order has no delivery partner.", 400, "NOT_ASSIGNED");
  if (!ASSIGNABLE.includes(order.status)) {
    throw new AppError("The partner already has the goods. Ask them to mark it as not delivered first.", 400, "PICKED_UP");
  }
  await clearPartner(order._id);
}

function clearPartner(orderId: Types.ObjectId, extra: Record<string, unknown> = {}) {
  return Order.updateOne(
    { _id: orderId },
    {
      ...(Object.keys(extra).length ? { $set: extra } : {}),
      $unset: {
        "delivery.partner": 1,
        "delivery.partnerName": 1,
        "delivery.partnerPhone": 1,
        "delivery.assignedAt": 1,
        "delivery.acceptedAt": 1,
      },
    }
  );
}

/** Orders a partner didn't accept in time go back to "unassigned" for an admin to reassign. */
export async function expireStaleAssignments() {
  const settings = await getDeliverySettings();
  const cutoff = new Date(Date.now() - settings.acceptWithinMinutes * 60 * 1000);
  const stale = await Order.find({
    status: { $in: ASSIGNABLE },
    "delivery.partner": { $exists: true },
    "delivery.acceptedAt": { $exists: false },
    "delivery.assignedAt": { $lt: cutoff },
  });
  for (const order of stale) {
    const d = order.delivery!;
    await Order.updateOne(
      { _id: order._id },
      { $push: { "delivery.attempts": { kind: "no-response", at: new Date(), partner: d.partner, partnerName: d.partnerName, fee: 0 } } }
    );
    await clearPartner(order._id, { "delivery.needsAttention": "no-response" });
    await notifyAdmins({
      type: "order-status",
      title: `${order.orderNumber} needs a delivery partner`,
      message: `${d.partnerName ?? "The partner"} didn't accept it in ${settings.acceptWithinMinutes} minutes.`,
      link: "/admin/orders",
    });
  }
  return stale.length;
}

// ---------- Partner actions ----------

export async function partnerForUser(userId: string) {
  const partner = await DeliveryPartner.findOne({ user: userId });
  if (!partner) throw new AppError("Delivery partner profile not found", 404, "NOT_FOUND");
  if (!partner.isActive) throw new AppError("Your delivery account is paused. Please contact the team.", 403, "PARTNER_BLOCKED");
  return partner;
}

async function myOrder(partner: DeliveryPartnerDocument, orderNumber: string) {
  const order = await loadOrder(orderNumber);
  if (!order.delivery?.partner?.equals(partner._id)) {
    throw new AppError("This delivery isn't assigned to you.", 403, "NOT_YOURS");
  }
  return order;
}

export async function acceptDelivery(partner: DeliveryPartnerDocument, orderNumber: string) {
  const order = await myOrder(partner, orderNumber);
  if (!order.delivery!.acceptedAt) {
    await Order.updateOne({ _id: order._id }, { $set: { "delivery.acceptedAt": new Date() } });
  }
}

export async function declineDelivery(partner: DeliveryPartnerDocument, orderNumber: string, reason?: string) {
  const order = await myOrder(partner, orderNumber);
  if (!ASSIGNABLE.includes(order.status)) {
    throw new AppError("You've already picked this up. Mark it as not delivered instead.", 400, "PICKED_UP");
  }
  const d = order.delivery!;
  await Order.updateOne(
    { _id: order._id },
    { $push: { "delivery.attempts": { kind: "declined", at: new Date(), partner: d.partner, partnerName: d.partnerName, reason, fee: 0 } } }
  );
  await clearPartner(order._id, { "delivery.needsAttention": "declined" });
  await notifyAdmins({
    type: "order-status",
    title: `${order.orderNumber} declined by ${d.partnerName ?? "the partner"}`,
    message: reason ? `Reason: ${reason}. Please assign someone else.` : "Please assign someone else.",
    link: "/admin/orders",
  });
}

export async function pickUpDelivery(partner: DeliveryPartnerDocument, orderNumber: string) {
  const order = await myOrder(partner, orderNumber);
  if (order.status !== "packed") {
    throw new AppError(
      order.status === "confirmed" ? "The shop hasn't packed this order yet." : `This order is already "${order.status}".`,
      400,
      "NOT_PACKED"
    );
  }
  const now = new Date();
  const extra: Record<string, unknown> = { "delivery.pickedUpAt": now };
  if (!order.delivery!.acceptedAt) extra["delivery.acceptedAt"] = now;
  await Order.updateOne({ _id: order._id }, { $unset: { "delivery.needsAttention": 1 } });
  return commitStatus(order, "out-for-delivery", "delivery", undefined, extra);
}

export async function completeDelivery(
  partner: DeliveryPartnerDocument,
  orderNumber: string,
  input: { code: string; cashCollected: number }
) {
  const order = await myOrder(partner, orderNumber);
  if (order.status !== "out-for-delivery") {
    throw new AppError("Mark it as picked up before delivering.", 400, "NOT_OUT_FOR_DELIVERY");
  }
  const extra = await deliveredFields({ userId: partner.user.toString(), role: "delivery" }, order, input);
  const updated = await commitStatus(order, "delivered", "delivery", undefined, extra);
  if (extra["delivery.needsAttention"] === "cash-mismatch") {
    await notifyAdmins({
      type: "order-status",
      title: `Cash check for ${order.orderNumber}`,
      message: `${order.delivery!.partnerName} collected ₹${input.cashCollected}, but the order total is ₹${order.total}.`,
      link: "/admin/orders",
    });
  }
  return updated;
}

export const FAIL_REASONS = ["Customer not available", "Wrong or incomplete address", "Customer refused the order", "Couldn't reach the customer by phone", "Other"];

/** The partner couldn't deliver: the order goes back to "packed", stays with them for a retry,
 * and an admin is asked to decide (retry, reassign or cancel). */
export async function failDelivery(partner: DeliveryPartnerDocument, orderNumber: string, reason: string, note?: string) {
  const order = await myOrder(partner, orderNumber);
  if (order.status !== "out-for-delivery") {
    throw new AppError("Only a delivery that's on its way can be marked as not delivered.", 400, "NOT_OUT_FOR_DELIVERY");
  }
  const d = order.delivery!;
  await Order.updateOne(
    { _id: order._id },
    { $push: { "delivery.attempts": { kind: "failed", at: new Date(), partner: d.partner, partnerName: d.partnerName, reason, note, fee: 0 } } }
  );
  const updated = await commitStatus(order, "packed", "delivery", `Not delivered: ${reason}${note ? ` (${note})` : ""}`, {
    "delivery.needsAttention": "failed",
  });
  await notifyAdmins({
    type: "order-status",
    title: `${order.orderNumber} not delivered`,
    message: `${d.partnerName ?? "The partner"}: ${reason}. Retry, reassign or cancel it.`,
    link: "/admin/orders",
  });
  return updated;
}

/** Admin: pays (or un-pays) a partner for a failed attempt. */
export async function setAttemptFee(orderNumber: string, index: number, fee: number) {
  const order = await loadOrder(orderNumber);
  const attempt = order.delivery?.attempts[index];
  if (!attempt || attempt.kind !== "failed") throw new AppError("Delivery attempt not found", 404, "NOT_FOUND");
  await Order.updateOne({ _id: order._id }, { $set: { [`delivery.attempts.${index}.fee`]: fee } });
}

/** Admin: marks that an order needing attention has been dealt with. */
export async function clearAttention(orderNumber: string) {
  const order = await loadOrder(orderNumber);
  await Order.updateOne({ _id: order._id }, { $unset: { "delivery.needsAttention": 1 } });
}

/** The shops a partner collects an order from. */
export async function pickupPoints(order: OrderDocument) {
  const ids = [...new Set(order.items.map((i) => i.seller.toString()))];
  const sellers = await Seller.find({ _id: { $in: ids } }).populate<{ user: Pick<UserDocument, "name" | "phone"> }>("user", "name phone");
  return sellers.map((s) => ({
    shop: s.farmName,
    contact: s.user?.name ?? "",
    phone: s.user?.phone ?? "",
    location: [s.location, s.district, s.state].filter(Boolean).join(", "),
    items: order.items
      .filter((i) => i.seller.equals(s._id))
      .map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit, size: i.size || undefined })),
  }));
}
