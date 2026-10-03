/**
 * Loads the sample catalog (categories, sellers, products) and an admin
 * account into MongoDB. Safe to run repeatedly: records are matched by slug or
 * email and updated in place.
 *
 *   npm run seed            # create or update sample data
 *   npm run seed -- --reset # first remove all products, sellers, categories, coupons
 *                           # and the sample seller accounts
 *
 * Requires SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD and SEED_SELLER_PASSWORD in
 * .env. Customer accounts are never touched.
 */
import mongoose, { type Types } from "mongoose";
import { connectDB } from "../config/db";
import { User } from "../models/User";
import { Seller } from "../models/Seller";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { categories, futureCategories } from "./data/categories";
import { sellers } from "./data/sellers";
import { products } from "./data/products";
import { coupons } from "./data/coupons";
import { Coupon } from "../models/Coupon";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be set in .env to run the seed`);
  }
  return value;
}

export async function seedCatalog(options: { reset: boolean; adminEmail: string; adminPassword: string; sellerPassword: string }) {
  if (options.reset) {
    const sellerEmails = sellers.map((s) => s.email.toLowerCase());
    await Promise.all([
      Product.deleteMany({}),
      Seller.deleteMany({}),
      Category.deleteMany({}),
      Coupon.deleteMany({}),
      User.deleteMany({ role: "seller", email: { $in: sellerEmails } }),
    ]);
    console.log("Reset: removed products, sellers, categories, coupons and sample seller accounts");
  }

  const allCategories = [
    ...categories.map((c) => ({ ...c, isActive: true })),
    ...futureCategories.map((c) => ({ ...c, isActive: false })),
  ];
  for (const [index, c] of allCategories.entries()) {
    await Category.updateOne(
      { slug: c.slug },
      { $set: { name: c.name, description: c.description, image: c.image, isActive: c.isActive, sortOrder: index } },
      { upsert: true }
    );
  }
  console.log(`Categories: ${allCategories.length}`);

  const adminEmail = options.adminEmail.toLowerCase();
  if (!(await User.exists({ email: adminEmail }))) {
    await User.create({
      emailVerified: true,
      name: "Admin",
      email: adminEmail,
      phone: "9000000000",
      password: options.adminPassword,
      role: "admin",
    });
    console.log(`Admin created: ${adminEmail}`);
  } else {
    // Never overwrite an existing admin's password from the seed.
    console.log(`Admin already exists: ${adminEmail} (password unchanged)`);
  }

  const sellerIdMap = new Map<string, Types.ObjectId>();
  for (const s of sellers) {
    const email = s.email.toLowerCase();
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name: s.name, email, phone: s.phone, password: options.sellerPassword, role: "seller", emailVerified: true });
    }
    const seller = await Seller.findOneAndUpdate(
      { user: user._id },
      {
        $set: {
          farmName: s.farmName,
          location: s.location,
          district: s.district,
          state: s.state,
          about: s.about,
          image: s.image,
          verified: s.verified,
          status: "approved",
          farmingType: s.farmingType,
          experienceYears: s.experienceYears,
          mainProducts: s.mainProducts ?? [],
          photos: s.photos ?? [],
          joinedYear: s.joinedYear,
          isActive: true,
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    sellerIdMap.set(s.id, seller._id);
  }
  console.log(`Sellers: ${sellers.length}`);

  for (const p of products) {
    const sellerId = sellerIdMap.get(p.sellerId);
    if (!sellerId) {
      throw new Error(`Product "${p.slug}" references unknown seller "${p.sellerId}"`);
    }
    await Product.updateOne(
      { slug: p.slug },
      {
        $set: {
          name: p.name,
          category: p.category,
          price: p.price,
          mrp: p.mrp,
          unit: p.unit,
          image: p.image,
          seller: sellerId,
          stock: p.stock,
          description: p.description,
          benefits: p.benefits,
          isOrganic: p.isOrganic,
          isFeatured: p.isFeatured,
          priceAvailable: p.priceAvailable ?? true,
          priceLabel: p.priceLabel,
          isActive: true,
        },
        $setOnInsert: { createdAt: new Date(p.createdAt) },
      },
      { upsert: true }
    );
  }
  console.log(`Products: ${products.length}`);

  // Only create missing coupons, so admin edits to them are never overwritten.
  for (const c of coupons) {
    await Coupon.updateOne({ code: c.code }, { $setOnInsert: { ...c, active: true } }, { upsert: true });
  }
  console.log(`Coupons: ${coupons.length}`);
}

async function main() {
  const reset = process.argv.includes("--reset");
  const adminEmail = requiredEnv("SEED_ADMIN_EMAIL");
  const adminPassword = requiredEnv("SEED_ADMIN_PASSWORD");
  const sellerPassword = requiredEnv("SEED_SELLER_PASSWORD");
  if (adminPassword.length < 8 || sellerPassword.length < 8) {
    throw new Error("Seed passwords must be at least 8 characters");
  }

  await connectDB();
  await seedCatalog({ reset, adminEmail, adminPassword, sellerPassword });
  await mongoose.disconnect();
  console.log("Seed complete");
}

if (require.main === module) {
  main().catch(async (err) => {
    console.error("Seed failed:", err instanceof Error ? err.message : err);
    await mongoose.disconnect();
    process.exit(1);
  });
}
