import type { Types } from "mongoose";
import { Seller, type SellerStatus } from "../models/Seller";

/** Ids of sellers whose products may be shown and sold: active and approved.
 * Seller counts are small, so a lookup per request is cheap. */
export async function sellableSellerIds(): Promise<Types.ObjectId[]> {
  const sellers = await Seller.find({ isActive: true, status: "approved" }).select("_id");
  return sellers.map((s) => s._id);
}

/** Pending sellers may prepare listings (hidden until approval); rejected
 * or suspended sellers may not add or edit products. */
export const CAN_MANAGE_PRODUCTS: SellerStatus[] = ["pending", "approved"];
