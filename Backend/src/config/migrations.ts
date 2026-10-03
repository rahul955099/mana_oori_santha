import { Seller } from "../models/Seller";

/** Small, idempotent data fixes run at startup. */
export async function runMigrations() {
  // Sellers created before approval existed were already selling; keep them live.
  const res = await Seller.updateMany({ status: { $exists: false } }, { $set: { status: "approved" } });
  if (res.modifiedCount > 0) {
    console.log(`Migration: marked ${res.modifiedCount} existing seller(s) as approved`);
  }
}
