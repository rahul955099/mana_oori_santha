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

/** Which statuses an order may move to from each status. */
const FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["out-for-delivery", "cancelled"],
  "out-for-delivery": ["delivered"],
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

  const stockLines = quote.lines.map((l) => ({ productId: l.product._id, quantity: l.quantity }));
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
    const sellerId = await sellerIdFor(actor.userId);
    // A seller fulfils an order only when every item in it is theirs;
    // mixed-seller orders are coordinated by an admin.
    if (sellerId && order.items.every((i) => i.seller.equals(sellerId))) return;
    throw new AppError("This order includes other sellers' items, so an admin manages its status.", 403, "FORBIDDEN");
  }

  throw new AppError("You can't change this order's status.", 403, "FORBIDDEN");
}

export async function changeStatus(actor: Actor, orderNumber: string, next: OrderStatus, note?: string) {
  const order = await Order.findOne({ orderNumber });
  if (!order || !(await canView(actor, order))) {
    throw new AppError("Order not found", 404, "NOT_FOUND");
  }
  await assertTransitionAllowed(actor, order, next);

  const set: Record<string, unknown> = { status: next };
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
    { $set: set, $push: { statusHistory: { status: next, at: new Date(), byRole: actor.role, note } } },
    { returnDocument: "after" }
  );
  if (!updated) {
    throw new AppError("This order was just updated by someone else. Please refresh.", 409, "CONFLICT");
  }

  if (next === "cancelled") {
    await releaseStock(order.items.map((i) => ({ productId: i.product, quantity: i.quantity })));
  }
  onOrderStatusChanged(updated, order.status, next, actor.role);
  return updated;
}
