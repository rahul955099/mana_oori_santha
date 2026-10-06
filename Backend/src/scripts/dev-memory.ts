/**
 * Runs the API against a throwaway in-memory MongoDB that is seeded with the
 * sample catalog — handy for trying the app without a MongoDB Atlas cluster.
 * All data is lost when the process stops.
 *
 *   npm run dev:memory
 *
 * Fixed demo logins are printed on startup. Your real SEED_* credentials in
 * .env are deliberately ignored, so they are never printed or reused here.
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
import { runMigrations } from "../config/migrations";
import { User } from "../models/User";
import { DeliveryPartner } from "../models/DeliveryPartner";
import { indiaToday } from "../services/deliverySettings.service";

async function main() {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  const adminEmail = "admin@manaoorisantha.local";
  const adminPassword = "admin12345";
  const sellerPassword = "seller12345";
  await seedCatalog({ reset: true, adminEmail, adminPassword, sellerPassword });
  // Same startup fixes as the real server (e.g. the Fashion categories).
  await runMigrations();
  // A delivery partner to try the delivery flow, available today and covering common practice pincodes.
  const partnerEmail = "partner@manaoorisantha.local";
  const partnerPassword = "partner12345";
  const partnerUser = await User.create({ name: "Ravi (Delivery)", email: partnerEmail, phone: "9123456789", password: partnerPassword, role: "delivery", emailVerified: true });
  await DeliveryPartner.create({ user: partnerUser._id, vehicle: "bike", serviceAreas: ["500079", "500074", "500035", "517501", "500001"], availableOn: indiaToday() });

  app.listen(env.port, () => {
    console.log(`\nIn-memory API running on http://localhost:${env.port} (data resets on restart)`);
    console.log(`  Admin login:  ${adminEmail} / ${adminPassword}`);
    console.log(`  Seller login: ramulu.farms@example.com / ${sellerPassword} (any sample seller email works)`);
    console.log(`  Delivery login: ${partnerEmail} / ${partnerPassword}\n`);
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
