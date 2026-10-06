import { Types } from "mongoose";
import { Order, type OrderDocument, type OrderStatus, type ShippingAddress } from "../models/Order";
import { Product } from "../models/Product";
import { Seller } from "../models/Seller";
import { Cart } from "../models/Cart";
import { nextSequence } from "../models/Counter";
import type { UserRole } from "../models/User";
import { AppError } from "../utils/AppError";
import { deliveryRules, isServiceablePincode, isValidPincode } from "../config/delivery";
import { buildQuote, type RequestedItem } from "./pricing.service";
import { env } from "../config/env";
import { onOrderPlaced, onOrderStatusChanged } from "./events.service";
import { deliveryFee, getDeliverySettings, newDeliveryCode } from "./deliverySettings.service";
import { AdminActivity } from "../models/AdminActivity";
import { User } from "../models/User";

/** Which statuses an order may move to from each status. */
const FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["out-for-delivery", "cancelled"],
  // Back to "packed" when a delivery attempt fails or the goods go back to the shop.
  "out-for-delivery": ["delivered", "packed"],
  delivered: ["return-requested"],
  // Moving back to "delivered" means the return request was rejected.
  "return-requested": ["returned", "delivered"],
  returned: [],
  cancelled: [],
};

const SELLER_ALLOWED = new Set<OrderStatus>(["confirmed", "packed", "out-for-delivery", "delivered", "cancelled"]);

export interface Actor {
  userId: string;
  role: UserRole;
}

/** Extra details when marking an order delivered. */
export interface DeliveredInput {
  /** The 4-digit code from the customer. */
  code?: string;
  /** Admins only: why they're marking it delivered without the code. */
  skipCodeReason?: string;
  /** Cash collected at the door (defaults to the order total). */
  cashCollected?: number;
}

export class CartChangedError extends AppError {
  constructor(problems: unknown[]) {
    super("Some items in your cart are no longer available in the requested quantity.", 409, "CART_CHANGED", { problems });
  }
}

/** Takes stock for every line, or none: on any failure the stock already
 * taken is put back. Each decrement is conditional on enough stock, so two
 * shoppers can never buy the same last unit. */
async function reserveStock(lines: { productId: Types.ObjectId; quantity: number }[]) {
  const taken: typeof lines = [];
  for (const line of lines) {
    const res = await Product.updateOne(
      { _id: line.productId, isActive: true, stock: { $gte: line.quantity } },
      { $inc: { stock: -line.quantity } }
    );
    if (res.modifiedCount !== 1) {
      await releaseStock(taken);
      const product = await Product.findById(line.productId).select("name stock");
      throw new CartChangedError([
        {
          productId: line.productId.toString(),
          name: product?.name,
          reason: product && product.stock > 0 ? "insufficient-stock" : "out-of-stock",
          available: product?.stock ?? 0,
        },
      ]);
    }
    taken.push(line);
  }
}

async function releaseStock(lines: { productId: Types.ObjectId; quantity: number }[]) {
  await Promise.all(lines.map((l) => Product.updateOne({ _id: l.productId }, { $inc: { stock: l.quantity } })));
}

export async function placeOrder(
  actor: Actor,
  input: { items: RequestedItem[]; couponCode?: string; shippingAddress: ShippingAddress }
): Promise<OrderDocument> {
  const { shippingAddress } = input;
  if (!isValidPincode(shippingAddress.pincode)) {
    throw new AppError("Please enter a valid 6-digit pincode.", 400, "VALIDATION_ERROR");
  }
  if (!isServiceablePincode(shippingAddress.pincode)) {
    throw new AppError("Sorry, we don't deliver to this pincode yet.", 400, "NOT_SERVICEABLE");
  }

  const quote = await buildQuote(input.items, input.couponCode, actor.userId);
  if (quote.problems.length > 0) {
    throw new CartChangedError(quote.problems);
  }
  if (quote.lines.length === 0) {
    throw new AppError("Your cart is empty.", 400, "EMPTY_CART");
  }
  if (quote.coupon && !quote.coupon.valid) {
    throw new AppError(quote.coupon.message, 400, "INVALID_COUPON");
  }

  // Sizes share stock, so take it once per product.
  const perProduct = new Map<string, { productId: Types.ObjectId; quantity: number }>();
  for (const l of quote.lines) {
    const key = l.product._id.toString();
    const entry = perProduct.get(key) ?? { productId: l.product._id, quantity: 0 };
    entry.quantity += l.quantity;
    perProduct.set(key, entry);
  }
  const stockLines = [...perProduct.values()];

  // Partner delivery if any seller in the order uses it, so the customer gets one delivery.
  const sellerIds = [...new Set(quote.lines.map((l) => l.product.seller.toString()))];
  const usesPartners = await Seller.exists({ _id: { $in: sellerIds }, deliveryMethod: "partner" });
  const delivery = {
    mode: (usesPartners ? "partner" : "self") as "partner" | "self",
    code: newDeliveryCode(),
    pickups: sellerIds.length,
    attempts: [],
  };
  await reserveStock(stockLines);

  try {
    const orderNumber = `MOS-${await nextSequence("order", 100000)}`;
    const order = await Order.create({
      orderNumber,
      user: actor.userId,
      items: quote.lines.map((l) => ({
        product: l.product._id,
        seller: l.product.seller,
        name: l.product.name,
        image: l.product.image,
        unit: l.product.unit,
        size: l.size,
        category: l.product.category,
        price: l.product.price,
        quantity: l.quantity,
      })),
      subtotal: quote.subtotal,
      discount: quote.discount,
      deliveryCharge: quote.deliveryCharge,
      total: quote.total,
      couponCode: quote.coupon?.valid ? quote.coupon.code : undefined,
      commissionRate: env.commissionPercent,
      paymentMethod: "cod",
      paymentStatus: "pending",
      status: "pending",
      statusHistory: [{ status: "pending", at: new Date(), byRole: actor.role }],
      shippingAddress,
      delivery,
    });
    // The order now holds what was in the cart.
    await Cart.updateOne({ user: actor.userId }, { $set: { items: [] }, $unset: { couponCode: 1 } });
    onOrderPlaced(order);
    return order;
  } catch (err) {
    await releaseStock(stockLines);
    throw err;
  }
}

async function sellerIdFor(userId: string): Promise<Types.ObjectId | null> {
  const seller = await Seller.findOne({ user: userId }).select("_id");
  return seller?._id ?? null;
}

/** The buyer's user id, whether or not `order.user` has been populated. */
export function buyerId(order: OrderDocument): string {
  const user = order.user as unknown as { _id?: Types.ObjectId };
  return (user._id ?? order.user).toString();
}

/** Whether `actor` may see this order (sellers: only orders with their items). */
export async function canView(actor: Actor, order: OrderDocument): Promise<boolean> {
  if (actor.role === "admin") return true;
  if (buyerId(order) === actor.userId) return true;
  if (actor.role === "seller") {
    const sellerId = await sellerIdFor(actor.userId);
    return !!sellerId && order.items.some((i) => i.seller.equals(sellerId));
  }
  return false;
}

/** Throws unless `actor` may move `order` to `next`. */
async function assertTransitionAllowed(actor: Actor, order: OrderDocument, next: OrderStatus) {
  if (!FLOW[order.status].includes(next)) {
    throw new AppError(`An order that is "${order.status}" can't be moved to "${next}".`, 400, "INVALID_TRANSITION");
  }
  if (actor.role === "admin") return;

  const isOwner = buyerId(order) === actor.userId;
  if (isOwner && next === "cancelled" && (order.status === "pending" || order.status === "confirmed")) return;
  if (isOwner && next === "return-requested") {
    const deliveredAt = order.deliveredAt ?? order.updatedAt;
    const deadline = deliveredAt.getTime() + deliveryRules.returnWindowDays * 24 * 60 * 60 * 1000;
    if (Date.now() > deadline) {
      throw new AppError(`Returns are accepted within ${deliveryRules.returnWindowDays} days of delivery.`, 400, "RETURN_WINDOW_CLOSED");
    }
    return;
  }

  if (actor.role === "seller" && SELLER_ALLOWED.has(next)) {
    if (order.delivery?.mode === "partner" && (next === "out-for-delivery" || next === "delivered")) {
      throw new AppError("A Mana Oori Santha delivery partner delivers this order.", 403, "PARTNER_DELIVERY");
    }
    const sellerId = await sellerIdFor(actor.userId);
    // A seller fulfils an order only when every item in it is theirs;
    // mixed-seller orders are coordinated by an admin.
    if (sellerId && order.items.every((i) => i.seller.equals(sellerId))) return;
    throw new AppError("This order includes other sellers' items, so an admin manages its status.", 403, "FORBIDDEN");
  }

  throw new AppError("You can't change this order's status.", 403, "FORBIDDEN");
}

export async function changeStatus(
  actor: Actor,
  orderNumber: string,
  next: OrderStatus,
  note?: string,
  delivered: DeliveredInput = {}
) {
  const order = await Order.findOne({ orderNumber });
  if (!order || !(await canView(actor, order))) {
    throw new AppError("Order not found", 404, "NOT_FOUND");
  }
  await assertTransitionAllowed(actor, order, next);

  const extra: Record<string, unknown> = {};
  if (next === "delivered" && order.status === "out-for-delivery") {
    Object.assign(extra, await deliveredFields(actor, order, delivered));
  }
  return commitStatus(order, next, actor.role, note, extra);
}

/** Checks the customer's code (or an admin's reason for skipping it) and works out
 * what gets recorded when an order is handed over. */
export async function deliveredFields(actor: Actor, order: OrderDocument, input: DeliveredInput) {
  const set: Record<string, unknown> = {};
  const d = order.delivery;
  if (!d) return set; // orders from before delivery codes

  const skipReason = input.skipCodeReason?.trim();
  if (actor.role === "admin" && skipReason) {
    const admin = await User.findById(actor.userId).select("name email");
    set["delivery.codeSkipped"] = { byName: admin?.name ?? "An admin", reason: skipReason, at: new Date() };
    await AdminActivity.create({
      action: "delivery.code-skipped",
      actorName: admin?.name ?? "An admin",
      actorEmail: admin?.email ?? "",
      targetEmail: `${order.orderNumber}: ${skipReason}`,
    });
  } else if (String(input.code ?? "").trim() !== d.code) {
    throw new AppError(
      actor.role === "admin"
        ? "Enter the customer's 4-digit delivery code, or give a reason to mark it delivered without it."
        : "That delivery code is wrong. Ask the customer for the 4-digit code shown in their order.",
      400,
      "WRONG_CODE"
    );
  }

  if (d.mode === "partner" && d.partner) {
    const cash = input.cashCollected ?? order.total;
    set["delivery.cashCollected"] = cash;
    set["delivery.fee"] = deliveryFee(await getDeliverySettings(), d.pickups);
    if (cash !== order.total) set["delivery.needsAttention"] = "cash-mismatch";
  }
  return set;
}

/** Moves an order to `next` and runs the side effects (restock on cancel, notifications).
 * Callers check permissions first. `extra` is merged into the update. */
export async function commitStatus(
  order: OrderDocument,
  next: OrderStatus,
  byRole: UserRole,
  note?: string,
  extra: Record<string, unknown> = {}
) {
  const set: Record<string, unknown> = { status: next, ...extra };
  if (next === "delivered" && order.status === "out-for-delivery") {
    set.deliveredAt = new Date();
    set.paymentStatus = "paid"; // cash collected on delivery
  }
  if (next === "returned" && order.paymentStatus === "paid") {
    set.paymentStatus = "refunded";
  }

  // Conditional on the current status so two simultaneous updates (e.g. a
  // double-clicked cancel) can't both apply and restock twice.
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: order.status },
    { $set: set, $push: { statusHistory: { status: next, at: new Date(), byRole, note } } },
    { returnDocument: "after" }
  );
  if (!updated) {
    throw new AppError("This order was just updated by someone else. Please refresh.", 409, "CONFLICT");
  }

  if (next === "cancelled") {
    await releaseStock(order.items.map((i) => ({ productId: i.product, quantity: i.quantity })));
  }
  onOrderStatusChanged(updated, order.status, next, byRole);
  return updated;
}
