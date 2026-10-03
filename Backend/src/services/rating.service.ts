import type { Types } from "mongoose";
import { Review } from "../models/Review";
import { Product } from "../models/Product";
import { Seller } from "../models/Seller";

async function averageOf(match: Record<string, unknown>) {
  const [row] = await Review.aggregate<{ avg: number; count: number }>([
    { $match: { ...match, status: "published" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  return { rating: row ? Math.round(row.avg * 10) / 10 : 0, reviewCount: row?.count ?? 0 };
}

/** Product and seller ratings come only from published customer reviews. */
export async function refreshRatings(productId: Types.ObjectId, sellerId: Types.ObjectId) {
  await Promise.all([
    averageOf({ product: productId }).then((r) => Product.updateOne({ _id: productId }, r)),
    averageOf({ seller: sellerId }).then((r) => Seller.updateOne({ _id: sellerId }, r)),
  ]);
}
