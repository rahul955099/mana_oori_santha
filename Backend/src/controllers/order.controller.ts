import type { Response } from "express";
import type { QueryFilter } from "mongoose";
import { Order, type OrderDocument, type OrderStatus } from "../models/Order";
import { Seller } from "../models/Seller";
import { AppError } from "../utils/AppError";
import { success } from "../utils/response";
import { escapeRegex } from "../utils/slugify";
import { toOrder, type OrderViewer } from "../utils/serialize";
import { buildQuote, serializeQuote } from "../services/pricing.service";
import { buyerId, canView, changeStatus, placeOrder, type Actor } from "../services/order.service";
import { expireStaleAssignments } from "../services/delivery.service";
import type { AuthRequest } from "../middleware/auth.middleware";

const USER_FIELDS = "userCode";
const MAX_LIST = 500;

function viewerOf(actor: Actor, isBuyer: boolean): OrderViewer {
  if (isBuyer) return "buyer";
  return actor.role === "admin" ? "admin" : "seller";
}

function actorOf(req: AuthRequest): Actor {
  return { userId: req.userId!, role: req.userRole! };
}

/** Price preview for checkout. Works for guests too (per-customer coupon
 * limits are checked once they log in). */
export async function quote(req: AuthRequest, res: Response) {
  const result = await buildQuote(req.body.items ?? [], req.body.couponCode, req.userId);
  success(res, "Quote calculated", serializeQuote(result));
}

export async function createOrder(req: AuthRequest, res: Response) {
  const order = await placeOrder(actorOf(req), {
    items: req.body.items,
    couponCode: req.body.couponCode,
    shippingAddress: req.body.shippingAddress,
  });
  await order.populate("user", USER_FIELDS);
  success(res, `Order ${order.orderNumber} placed successfully`, { order: toOrder(order) }, 201);
}

export async function listMyOrders(req: AuthRequest, res: Response) {
  const orders = await Order.find({ user: req.userId }).sort({ createdAt: -1 }).limit(MAX_LIST).populate("user", USER_FIELDS);
  success(res, "Orders fetched", { orders: orders.map((o) => toOrder(o)) });
}

/** Seller: orders containing at least one of their products, showing only their items. */
export async function listSellerOrders(req: AuthRequest, res: Response) {
  const seller = await Seller.findOne({ user: req.userId }).select("_id");
  if (!seller) {
    throw new AppError("Seller profile not found", 404, "NOT_FOUND");
  }
  const orders = await Order.find({ "items.seller": seller._id })
    .sort({ createdAt: -1 })
    .limit(MAX_LIST)
    .populate("user", USER_FIELDS);
  success(res, "Orders fetched", { orders: orders.map((o) => toOrder(o, { onlySellerId: seller._id })) });
}

/** Admin: every order, optionally filtered by status or searched by order number / customer name. */
export async function listAllOrders(req: AuthRequest, res: Response) {
  const filter: QueryFilter<OrderDocument> = {};
  const { status, search, delivery } = req.query as Record<string, string | undefined>;
  if (status) filter.status = status as OrderStatus;
  if (delivery === "unassigned") {
    Object.assign(filter, {
      "delivery.mode": "partner",
      "delivery.partner": { $exists: false },
      status: status ? status : { $in: ["confirmed", "packed"] },
    });
  }
  if (delivery === "attention") {
    Object.assign(filter, { "delivery.needsAttention": { $exists: true }, status: status ? status : { $nin: ["cancelled", "returned"] } });
  }
  await expireStaleAssignments();
  if (search) {
    const pattern = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [{ orderNumber: pattern }, { "shippingAddress.fullName": pattern }];
  }
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(MAX_LIST).populate("user", USER_FIELDS);
  success(res, "Orders fetched", { orders: orders.map((o) => toOrder(o, { viewer: "admin" })) });
}

export async function getOrder(req: AuthRequest, res: Response) {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber }).populate("user", USER_FIELDS);
  const actor = actorOf(req);
  if (!order || !(await canView(actor, order))) {
    throw new AppError("Order not found", 404, "NOT_FOUND");
  }
  const isBuyer = buyerId(order) === actor.userId;
  let onlySellerId;
  if (actor.role === "seller" && !isBuyer) {
    onlySellerId = (await Seller.findOne({ user: actor.userId }).select("_id"))?._id;
  }
  success(res, "Order fetched", { order: toOrder(order, { onlySellerId, viewer: viewerOf(actor, isBuyer) }) });
}

export async function updateOrderStatus(req: AuthRequest, res: Response) {
  const actor = actorOf(req);
  const updated = await changeStatus(actor, String(req.params.orderNumber), req.body.status, req.body.note, {
    code: req.body.code,
    skipCodeReason: req.body.skipCodeReason,
    cashCollected: req.body.cashCollected,
  });
  await updated.populate("user", USER_FIELDS);

  let onlySellerId;
  if (actor.role === "seller" && buyerId(updated) !== actor.userId) {
    onlySellerId = (await Seller.findOne({ user: actor.userId }).select("_id"))?._id;
  }
  success(res, "Order status updated", {
    order: toOrder(updated, { onlySellerId, viewer: viewerOf(actor, buyerId(updated) === actor.userId) }),
  });
}
