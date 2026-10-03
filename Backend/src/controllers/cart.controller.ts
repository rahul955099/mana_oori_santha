import type { Response } from "express";
import { Types } from "mongoose";
import { Cart } from "../models/Cart";
import { Product } from "../models/Product";
import { User } from "../models/User";
import { success } from "../utils/response";
import { normalizeItems } from "../services/pricing.service";
import type { AuthRequest } from "../middleware/auth.middleware";

/** Ids from `ids` that are active products, in the given order. */
async function activeProductIds(ids: string[]): Promise<Set<string>> {
  const valid = ids.filter((id) => Types.ObjectId.isValid(id));
  const found = await Product.find({ _id: { $in: valid }, isActive: true }).select("_id");
  return new Set(found.map((p) => p._id.toString()));
}

function serializeCart(items: { product: Types.ObjectId; quantity: number }[], couponCode?: string) {
  return {
    items: items.map((i) => ({ productId: i.product.toString(), quantity: i.quantity })),
    couponCode: couponCode ?? null,
  };
}

export async function getCart(req: AuthRequest, res: Response) {
  const cart = await Cart.findOne({ user: req.userId });
  if (!cart) {
    return success(res, "Cart fetched", serializeCart([]));
  }
  // Hide products that were removed from the store since they were added.
  const active = await activeProductIds(cart.items.map((i) => i.product.toString()));
  success(res, "Cart fetched", serializeCart(cart.items.filter((i) => active.has(i.product.toString())), cart.couponCode));
}

/** Replaces the whole cart. The client owns cart edits and syncs the result;
 * stock and prices are checked at quote/checkout time, not here. */
export async function replaceCart(req: AuthRequest, res: Response) {
  const items = normalizeItems(req.body.items ?? []);
  const active = await activeProductIds(items.map((i) => i.productId));
  const kept = items
    .filter((i) => active.has(i.productId))
    .map((i) => ({ product: new Types.ObjectId(i.productId), quantity: Math.min(i.quantity, 99) }));
  const couponCode = req.body.couponCode ? String(req.body.couponCode).trim().toUpperCase() : undefined;

  await Cart.updateOne(
    { user: req.userId },
    couponCode ? { $set: { items: kept, couponCode } } : { $set: { items: kept }, $unset: { couponCode: 1 } },
    { upsert: true }
  );
  success(res, "Cart saved", serializeCart(kept, couponCode));
}

export async function getWishlist(req: AuthRequest, res: Response) {
  const user = await User.findById(req.userId).select("wishlist");
  const ids = (user?.wishlist ?? []).map((id) => id.toString());
  const active = await activeProductIds(ids);
  success(res, "Wishlist fetched", { productIds: ids.filter((id) => active.has(id)) });
}

export async function replaceWishlist(req: AuthRequest, res: Response) {
  const requested = [...new Set((req.body.productIds ?? []) as string[])];
  const active = await activeProductIds(requested);
  const kept = requested.filter((id) => active.has(id));
  await User.updateOne({ _id: req.userId }, { $set: { wishlist: kept.map((id) => new Types.ObjectId(id)) } });
  success(res, "Wishlist saved", { productIds: kept });
}
