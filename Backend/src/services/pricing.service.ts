import { Types } from "mongoose";
import { Product, type ProductDocument } from "../models/Product";
import { Coupon, type CouponDocument } from "../models/Coupon";
import { Order } from "../models/Order";
import { deliveryChargeFor } from "../config/delivery";
import { sellableSellerIds } from "./sellerAccess.service";

export interface RequestedItem {
  productId: string;
  quantity: number;
}

export interface PricedLine {
  product: ProductDocument;
  quantity: number;
  lineTotal: number;
}

/** Why a requested cart line can't be bought right now. */
export interface LineProblem {
  productId: string;
  name?: string;
  reason: "unavailable" | "out-of-stock" | "insufficient-stock" | "no-price";
  available?: number;
}

export interface CouponOutcome {
  code: string;
  valid: boolean;
  message: string;
  discount: number;
  coupon?: CouponDocument;
}

export interface Quote {
  lines: PricedLine[];
  problems: LineProblem[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  total: number;
  coupon: CouponOutcome | null;
}

/** Merges duplicate product ids and drops malformed entries. */
export function normalizeItems(items: RequestedItem[]): RequestedItem[] {
  const merged = new Map<string, number>();
  for (const item of items) {
    if (!Types.ObjectId.isValid(item.productId)) continue;
    const quantity = Math.floor(Number(item.quantity));
    if (!(quantity > 0)) continue;
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + quantity);
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

/** Looks up live prices and stock. Prices always come from the database,
 * never from the client. */
export async function priceItems(items: RequestedItem[]): Promise<{ lines: PricedLine[]; problems: LineProblem[] }> {
  const requested = normalizeItems(items);
  const products = await Product.find({
    _id: { $in: requested.map((i) => i.productId) },
    isActive: true,
    seller: { $in: await sellableSellerIds() },
  });
  const byId = new Map(products.map((p) => [p._id.toString(), p]));

  const lines: PricedLine[] = [];
  const problems: LineProblem[] = [];
  for (const { productId, quantity } of requested) {
    const product = byId.get(productId);
    if (!product) {
      problems.push({ productId, reason: "unavailable" });
    } else if (!product.priceAvailable) {
      problems.push({ productId, name: product.name, reason: "no-price" });
    } else if (product.stock <= 0) {
      problems.push({ productId, name: product.name, reason: "out-of-stock", available: 0 });
    } else if (product.stock < quantity) {
      problems.push({ productId, name: product.name, reason: "insufficient-stock", available: product.stock });
    } else {
      lines.push({ product, quantity, lineTotal: product.price * quantity });
    }
  }
  return { lines, problems };
}

export async function evaluateCoupon(
  rawCode: string,
  lines: PricedLine[],
  subtotal: number,
  userId?: string
): Promise<CouponOutcome> {
  const code = rawCode.trim().toUpperCase();
  const fail = (message: string): CouponOutcome => ({ code, valid: false, message, discount: 0 });

  const coupon = await Coupon.findOne({ code });
  if (!coupon || !coupon.active || (coupon.expiresAt && coupon.expiresAt < new Date())) {
    return fail("Invalid or expired coupon code.");
  }
  if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
    return fail(`This coupon needs a minimum order of ₹${coupon.minOrderValue}.`);
  }

  let eligible = subtotal;
  if (coupon.categoryOnly) {
    eligible = lines.filter((l) => l.product.category === coupon.categoryOnly).reduce((s, l) => s + l.lineTotal, 0);
    if (eligible === 0) {
      return fail(`This coupon only applies to ${coupon.categoryOnly} products.`);
    }
  }

  if (coupon.usageLimitPerUser) {
    if (!userId) {
      return fail("Please log in to use this coupon.");
    }
    const used = await Order.countDocuments({ user: userId, couponCode: code, status: { $ne: "cancelled" } });
    if (used >= coupon.usageLimitPerUser) {
      return fail(
        coupon.usageLimitPerUser === 1
          ? "You have already used this coupon."
          : `This coupon can be used ${coupon.usageLimitPerUser} times per customer.`
      );
    }
  }

  let discount = coupon.type === "flat" ? coupon.value : Math.round((eligible * coupon.value) / 100);
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, eligible);

  return { code, valid: true, message: `Coupon "${code}" applied!`, discount, coupon };
}

/** Full price breakdown for a set of items. The same function prices the
 * checkout preview and the final order, so the two can never disagree. */
export async function buildQuote(items: RequestedItem[], couponCode?: string, userId?: string): Promise<Quote> {
  const { lines, problems } = await priceItems(items);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const coupon = couponCode?.trim() ? await evaluateCoupon(couponCode, lines, subtotal, userId) : null;
  const discount = coupon?.valid ? coupon.discount : 0;
  // Delivery is based on the pre-discount subtotal, matching what the cart shows.
  const deliveryCharge = deliveryChargeFor(subtotal);
  return { lines, problems, subtotal, discount, deliveryCharge, total: subtotal - discount + deliveryCharge, coupon };
}

/** Client-facing shape of a quote. */
export function serializeQuote(quote: Quote) {
  return {
    items: quote.lines.map((l) => ({
      productId: l.product._id.toString(),
      name: l.product.name,
      price: l.product.price,
      quantity: l.quantity,
      lineTotal: l.lineTotal,
    })),
    problems: quote.problems,
    subtotal: quote.subtotal,
    discount: quote.discount,
    deliveryCharge: quote.deliveryCharge,
    total: quote.total,
    coupon: quote.coupon
      ? { code: quote.coupon.code, valid: quote.coupon.valid, message: quote.coupon.message, discount: quote.coupon.discount }
      : null,
  };
}
