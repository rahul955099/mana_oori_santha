/**
 * Runs the API against a throwaway in-memory MongoDB that is seeded with the
 * sample catalog — handy for trying the app without a MongoDB Atlas cluster.
 * All data is lost when the process stops.
 *
 *   npm run dev:memory
 *
 * Logins are printed on startup. Passwords come from SEED_ADMIN_PASSWORD /
 * SEED_SELLER_PASSWORD when set, otherwise local-only defaults are used.
 */
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://in-memory";
process.env.JWT_SECRET = process.env.JWT_SECRET || "local-in-memory-dev-only-secret";
// Throwaway demo data never sends real email; messages are printed to this log instead.
process.env.SMTP_HOST = "";
// Reuse the MongoDB binary cached by `npm install`, whatever directory this is launched from.
process.env.MONGOMS_DOWNLOAD_DIR ||= require("node:path").resolve(__dirname, "../../node_modules/.cache/mongodb-memory-server");

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app";
import { env } from "../config/env";
import { seedCatalog } from "../seed/seed";

async function main() {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@manaoorisantha.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin12345";
  const sellerPassword = process.env.SEED_SELLER_PASSWORD || "seller12345";
  await seedCatalog({ reset: true, adminEmail, adminPassword, sellerPassword });

  app.listen(env.port, () => {
    console.log(`\nIn-memory API running on http://localhost:${env.port} (data resets on restart)`);
    console.log(`  Admin login:  ${adminEmail} / ${adminPassword}`);
    console.log(`  Seller login: ramulu.farms@example.com / ${sellerPassword} (any sample seller email works)\n`);
  });

  const shutdown = async () => {
    await mongoose.disconnect();
    await mongo.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start in-memory API:", err);
  process.exit(1);
});
