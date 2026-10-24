import type { Types } from "mongoose";
import { Seller } from "../models/Seller";
import { Product } from "../models/Product";
import { Review } from "../models/Review";
import { User } from "../models/User";
import { Category } from "../models/Category";
import { products as catalog } from "../seed/data/products";

/** Small, idempotent data fixes run at startup. */
export async function runMigrations() {
  // Sellers created before approval existed were already selling; keep them live.
  const res = await Seller.updateMany({ status: { $exists: false } }, { $set: { status: "approved" } });
  if (res.modifiedCount > 0) {
    console.log(`Migration: marked ${res.modifiedCount} existing seller(s) as approved`);
  }

  // Products listed before owner approval existed were already on sale; keep them live.
  const products = await Product.updateMany({ approvalStatus: { $exists: false } }, { $set: { approvalStatus: "approved" } });
  if (products.modifiedCount > 0) {
    console.log(`Migration: marked ${products.modifiedCount} existing product(s) as approved`);
  }

  await recalculateAllRatings();
  await ensureOwner();
  await ensureFashionCategories();
  await fillMissingTeluguNames();
}

const normalizeName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

/** Gives catalog products without a Telugu name the one from the curated
 * catalog, matched by slug or, failing that, by English name. A Telugu name an
 * admin or seller has already entered is never overwritten. */
export async function fillMissingTeluguNames() {
  const bySlug = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const p of catalog) {
    if (!p.nameTe) continue;
    bySlug.set(p.slug, p.nameTe);
    byName.set(normalizeName(p.name), p.nameTe);
  }

  const missing = { $or: [{ nameTe: { $exists: false } }, { nameTe: null }, { nameTe: "" }] };
  const products = await Product.find(missing).select("slug name").lean();
  const ops = products.flatMap((p) => {
    const nameTe = bySlug.get(p.slug) ?? byName.get(normalizeName(p.name));
    // The filter repeats the "still missing" check so a concurrent edit is never overwritten.
    return nameTe ? [{ updateOne: { filter: { _id: p._id, ...missing }, update: { $set: { nameTe } } } }] : [];
  });
  if (ops.length) {
    const res = await Product.bulkWrite(ops);
    console.log(`Migration: added Telugu names to ${res.modifiedCount} product(s)`);
  }
}

/** The MAAD Fashions page lists products from these categories. Created once;
 * admins can rename them or add photos later. */
export const FASHION_CATEGORIES = [
  { slug: "dresses", name: "Dresses", description: "Everyday and occasion dresses from MAAD Fashions." },
  { slug: "sarees", name: "Sarees", description: "Silk, cotton and designer sarees from MAAD Fashions." },
  { slug: "customised-dresses", name: "Customised Dresses", description: "Dresses made to your design and measurements." },
];

export async function ensureFashionCategories() {
  for (const [i, c] of FASHION_CATEGORIES.entries()) {
    const res = await Category.updateOne({ slug: c.slug }, { $setOnInsert: { ...c, sortOrder: 100 + i, isActive: true } }, { upsert: true });
    if (res.upsertedCount > 0) console.log(`Migration: added the ${c.name} category`);
  }
}

/** The site always has an owner: if none exists (e.g. data from before owners
 * existed), the longest-serving active admin becomes the owner. */
export async function ensureOwner() {
  if (await User.exists({ role: "admin", isActive: true, isOwner: true })) return;
  const first = await User.findOne({ role: "admin", isActive: true }).sort({ createdAt: 1 });
  if (first) {
    await User.updateOne({ _id: first._id }, { isOwner: true });
    console.log(`Migration: ${first.email} is now the site owner`);
  }
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
