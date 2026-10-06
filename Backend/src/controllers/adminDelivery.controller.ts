import type { Response } from "express";
import { Order } from "../models/Order";
import { User, type UserDocument } from "../models/User";
import { DeliveryPartner, type Vehicle } from "../models/DeliveryPartner";
import { AdminInvite } from "../models/AdminInvite";
import { AdminActivity, type AdminAction } from "../models/AdminActivity";
import { PartnerSettlement } from "../models/PartnerSettlement";
import { AppError } from "../utils/AppError";
import { success } from "../utils/response";
import { createOneTimeToken } from "../utils/tokens";
import { sendMailInBackground } from "../services/mail.service";
import { notifyUser } from "../services/notification.service";
import { deliveryInviteEmail, siteLink } from "../services/emailTemplates";
import { getDeliverySettings, indiaToday, updateDeliverySettings } from "../services/deliverySettings.service";
import {
  assignOrders,
  clearAttention,
  expireStaleAssignments,
  partnerStats,
  setAttemptFee,
  suggestPartners,
  unassignOrder,
} from "../services/delivery.service";
import type { AuthRequest } from "../middleware/auth.middleware";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
type PartnerUser = Pick<UserDocument, "_id" | "name" | "email" | "phone" | "isActive" | "userCode">;

async function record(req: AuthRequest, action: AdminAction, target: string) {
  const actor = await User.findById(req.userId).select("name email");
  await AdminActivity.create({ action, actorName: actor?.name ?? "An admin", actorEmail: actor?.email ?? "", targetEmail: target });
}

function openDeliveryInvites() {
  return { role: "delivery" as const, acceptedAt: { $exists: false }, cancelledAt: { $exists: false }, expiresAt: { $gt: new Date() } };
}

/** Pincodes from a list or comma/space separated text: 6 digits each, no repeats. */
function cleanAreas(input: unknown): string[] {
  const parts = Array.isArray(input) ? input.map(String) : String(input ?? "").split(/[\s,]+/);
  const valid = parts.map((p) => p.trim()).filter((p) => /^\d{6}$/.test(p));
  return [...new Set(valid)];
}

async function partnersWithStats() {
  const partners = await DeliveryPartner.find()
    .sort({ createdAt: 1 })
    .populate<{ user: PartnerUser }>("user", "name email phone isActive userCode");
  const stats = await partnerStats(partners.map((p) => p._id));
  const today = indiaToday();
  return partners.map((p) => ({
    id: p._id.toString(),
    userCode: p.user?.userCode,
    name: p.user?.name ?? "",
    email: p.user?.email ?? "",
    phone: p.user?.phone ?? "",
    vehicle: p.vehicle,
    serviceAreas: p.serviceAreas,
    availableToday: p.availableOn === today,
    isActive: p.isActive && !!p.user?.isActive,
    joined: p.createdAt,
    stats: stats.get(p._id.toString())!,
  }));
}

/** Admin: every partner with workload and money figures, plus pending invitations. */
export async function listPartners(_req: AuthRequest, res: Response) {
  const [partners, invites, settings] = await Promise.all([
    partnersWithStats(),
    AdminInvite.find(openDeliveryInvites()).sort({ createdAt: -1 }).populate("invitedBy", "name"),
    getDeliverySettings(),
  ]);
  success(res, "Delivery partners fetched", {
    partners,
    invites: invites.map((i) => ({
      id: i._id.toString(),
      email: i.email,
      vehicle: i.delivery?.vehicle,
      serviceAreas: i.delivery?.serviceAreas ?? [],
      invitedBy: (i.invitedBy as unknown as { name?: string })?.name ?? "",
      expiresAt: i.expiresAt,
    })),
    settings,
  });
}

async function sendDeliveryInvite(req: AuthRequest, email: string, delivery: { vehicle: Vehicle; serviceAreas: string[] }) {
  const { raw, hash } = createOneTimeToken();
  await AdminInvite.create({
    email,
    role: "delivery",
    delivery,
    tokenHash: hash,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    invitedBy: req.userId,
  });
  const actor = await User.findById(req.userId).select("name");
  sendMailInBackground({ to: email, ...deliveryInviteEmail(actor?.name ?? "The team", siteLink(`/accept-invite?token=${raw}`)) });
}

/** Admin: invites someone to be a delivery partner. They set up their own login from the email. */
export async function invitePartner(req: AuthRequest, res: Response) {
  const email = String(req.body.email);
  if (await User.exists({ email })) {
    throw new AppError(
      "This email already has an account on the site. Use a different email for the delivery partner's login.",
      409,
      "EMAIL_IN_USE"
    );
  }
  if (await AdminInvite.exists({ email, ...openDeliveryInvites() })) {
    throw new AppError("An invitation to this email is already waiting. Use Resend if they can't find it.", 409, "INVITE_PENDING");
  }
  const serviceAreas = cleanAreas(req.body.serviceAreas);
  await sendDeliveryInvite(req, email, { vehicle: req.body.vehicle, serviceAreas });
  await record(req, "delivery.invited", email);
  success(res, `Invitation sent to ${email}.`, { invited: true }, 201);
}

export async function resendPartnerInvite(req: AuthRequest, res: Response) {
  const invite = await AdminInvite.findOne({ _id: req.params.inviteId, role: "delivery", acceptedAt: { $exists: false }, cancelledAt: { $exists: false } });
  if (!invite) throw new AppError("Invitation not found", 404, "NOT_FOUND");
  invite.cancelledAt = new Date();
  await invite.save();
  await sendDeliveryInvite(req, invite.email, { vehicle: invite.delivery?.vehicle ?? "bike", serviceAreas: invite.delivery?.serviceAreas ?? [] });
  success(res, `Invitation re-sent to ${invite.email}.`);
}

export async function cancelPartnerInvite(req: AuthRequest, res: Response) {
  const invite = await AdminInvite.findOneAndUpdate(
    { _id: req.params.inviteId, role: "delivery", acceptedAt: { $exists: false }, cancelledAt: { $exists: false } },
    { cancelledAt: new Date() }
  );
  if (!invite) throw new AppError("Invitation not found", 404, "NOT_FOUND");
  success(res, `Invitation to ${invite.email} cancelled.`);
}

/** Admin: change a partner's vehicle or areas, or block / unblock them. */
export async function updatePartner(req: AuthRequest, res: Response) {
  const partner = await DeliveryPartner.findById(req.params.partnerId).populate<{ user: PartnerUser }>("user", "name email");
  if (!partner) throw new AppError("Delivery partner not found", 404, "NOT_FOUND");
  if (req.body.vehicle !== undefined) partner.vehicle = req.body.vehicle;
  if (req.body.serviceAreas !== undefined) partner.serviceAreas = cleanAreas(req.body.serviceAreas);
  if (req.body.isActive !== undefined) {
    partner.isActive = req.body.isActive;
    if (!partner.isActive) partner.availableOn = undefined;
  }
  await partner.save();
  await record(req, "delivery.partner-updated", partner.user?.email ?? "");
  if (req.body.isActive !== undefined && partner.user) {
    await notifyUser(partner.user._id, {
      type: "account",
      title: partner.isActive ? "Your delivery account is active again" : "Your delivery account is paused",
      message: partner.isActive ? "You can switch on availability and take deliveries." : "Please contact the team for details.",
    });
  }
  success(res, "Delivery partner updated");
}

export async function getSuggestions(req: AuthRequest, res: Response) {
  await expireStaleAssignments();
  const order = await Order.findOne({ orderNumber: req.params.orderNumber });
  if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
  success(res, "Suggestions fetched", { suggestions: await suggestPartners(order) });
}

export async function assign(req: AuthRequest, res: Response) {
  const orderNumbers = [...new Set((req.body.orderNumbers as string[]).map(String))];
  const { partnerName, count } = await assignOrders(orderNumbers, String(req.body.partnerId));
  success(res, count === 1 ? `${orderNumbers[0]} assigned to ${partnerName}.` : `${count} orders assigned to ${partnerName}.`);
}

export async function unassign(req: AuthRequest, res: Response) {
  await unassignOrder(String(req.params.orderNumber));
  success(res, "Delivery partner removed from the order.");
}

export async function grantAttemptFee(req: AuthRequest, res: Response) {
  await setAttemptFee(String(req.params.orderNumber), Number(req.params.index), Number(req.body.fee));
  success(res, "Attempt fee updated.");
}

export async function resolveAttention(req: AuthRequest, res: Response) {
  await clearAttention(String(req.params.orderNumber));
  success(res, "Marked as handled.");
}

export async function getSettings(_req: AuthRequest, res: Response) {
  success(res, "Delivery settings fetched", { settings: await getDeliverySettings() });
}

/** Owner: change fees and limits. */
export async function saveSettings(req: AuthRequest, res: Response) {
  const settings = await updateDeliverySettings(req.body);
  await record(
    req,
    "delivery.settings-changed",
    `₹${settings.feePerDelivery}/delivery, +₹${settings.extraPickupFee}/extra pickup, max ${settings.maxActiveDeliveries}, cash limit ₹${settings.cashLimit}`
  );
  success(res, "Delivery settings saved.", { settings });
}

/** Owner: what each partner holds and is owed, with the history of handovers and payments. */
export async function listSettlements(_req: AuthRequest, res: Response) {
  const [partners, history] = await Promise.all([
    partnersWithStats(),
    PartnerSettlement.find()
      .sort({ at: -1 })
      .limit(200)
      .populate<{ partner: { user: { name?: string } } }>({ path: "partner", select: "user", populate: { path: "user", select: "name" } })
      .populate("recordedBy", "name"),
  ]);
  success(res, "Settlements fetched", {
    partners,
    history: history.map((h) => ({
      id: h._id.toString(),
      partnerName: h.partner?.user?.name ?? "",
      kind: h.kind,
      amount: h.amount,
      method: h.method,
      reference: h.reference,
      note: h.note,
      at: h.at,
      recordedBy: (h.recordedBy as unknown as { name?: string })?.name ?? "",
    })),
  });
}

/** Owner: records cash the partner handed over and/or fees paid to (or kept by) them. */
export async function recordSettlement(req: AuthRequest, res: Response) {
  const partner = await DeliveryPartner.findById(req.body.partnerId).populate<{ user: PartnerUser }>("user", "name email");
  if (!partner) throw new AppError("Delivery partner not found", 404, "NOT_FOUND");
  const s = (await partnerStats([partner._id])).get(partner._id.toString())!;
  const cash = Number(req.body.cashReceived ?? 0);
  const fees = Number(req.body.feesPaid ?? 0);
  if (cash <= 0 && fees <= 0) throw new AppError("Enter the cash received or the fees paid.", 400, "VALIDATION_ERROR");
  if (cash > s.cashInHand) {
    throw new AppError(`${partner.user?.name} only holds ₹${s.cashInHand} of collected cash.`, 400, "AMOUNT_TOO_HIGH");
  }
  const unpaid = Math.round((s.feesEarned - s.feesPaid) * 100) / 100;
  if (fees > unpaid) {
    throw new AppError(`${partner.user?.name} has ₹${Math.max(0, unpaid)} of unpaid fees.`, 400, "AMOUNT_TOO_HIGH");
  }
  const common = {
    partner: partner._id,
    method: req.body.method,
    reference: req.body.reference,
    note: req.body.note,
    at: req.body.at ?? new Date(),
    recordedBy: req.userId,
  };
  if (cash > 0) await PartnerSettlement.create({ ...common, kind: "cash-received", amount: cash });
  if (fees > 0) await PartnerSettlement.create({ ...common, kind: "fee-paid", amount: fees });
  const parts = [cash > 0 ? `₹${cash} cash received` : "", fees > 0 ? `₹${fees} fees paid` : ""].filter(Boolean).join(", ");
  await record(req, "delivery.settlement", `${partner.user?.email}: ${parts}`);
  if (partner.user) {
    await notifyUser(partner.user._id, { type: "account", title: "Settlement recorded", message: `${parts}.`, link: "/delivery/earnings" });
  }
  success(res, `Recorded for ${partner.user?.name}: ${parts}.`, {}, 201);
}
