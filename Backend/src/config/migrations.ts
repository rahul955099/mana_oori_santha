import type { Types } from "mongoose";
import { Seller } from "../models/Seller";
import { Product } from "../models/Product";
import { Review } from "../models/Review";

/** Small, idempotent data fixes run at startup. */
export async function runMigrations() {
  // Sellers created before approval existed were already selling; keep them live.
  const res = await Seller.updateMany({ status: { $exists: false } }, { $set: { status: "approved" } });
  if (res.modifiedCount > 0) {
    console.log(`Migration: marked ${res.modifiedCount} existing seller(s) as approved`);
  }

  await recalculateAllRatings();
}

async function averagesBy(field: "$product" | "$seller") {
  const rows = await Review.aggregate<{ _id: Types.ObjectId; avg: number; count: number }>([
    { $match: { status: "published" } },
    { $group: { _id: field, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  return rows.map((r) => ({
    updateOne: {
      filter: { _id: r._id },
      update: { $set: { rating: Math.round(r.avg * 10) / 10, reviewCount: r.count } },
    },
  }));
}

/** Ratings shown to customers come only from published reviews. Recomputing
 * everything at startup also clears sample ratings that older seed data set. */
export async function recalculateAllRatings() {
  const [productOps, sellerOps] = await Promise.all([averagesBy("$product"), averagesBy("$seller")]);
  await Promise.all([
    Product.updateMany({}, { $set: { rating: 0, reviewCount: 0 } }),
    Seller.updateMany({}, { $set: { rating: 0, reviewCount: 0 } }),
  ]);
  if (productOps.length) await Product.bulkWrite(productOps);
  if (sellerOps.length) await Seller.bulkWrite(sellerOps);
}
