import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { User } from "../models/User";

function redact(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.replace(/\/\/[^@/\s]+@/g, "//<redacted>@");
}

async function main() {
  console.log("STEP connectDB: starting");
  await connectDB();
  console.log("STEP connectDB: PASS");

  const email = `db-verify-${Date.now()}@example.com`;
  console.log("STEP createUser: starting");
  const created = await User.create({
    name: "DB Verify Temp User",
    email,
    phone: "9999999999",
    password: "TempPassw0rd!",
    role: "customer",
  });
  console.log("STEP createUser: PASS", { id: created._id.toString() });

  console.log("STEP fetchUser: starting");
  const fetched = await User.findById(created._id);
  if (!fetched || fetched.email !== email) {
    throw new Error("Fetched user did not match created user");
  }
  console.log("STEP fetchUser: PASS", { matchesEmail: fetched.email === email, isActive: fetched.isActive });

  console.log("STEP deleteUser: starting");
  await User.deleteOne({ _id: created._id });
  const shouldBeGone = await User.findById(created._id);
  if (shouldBeGone) {
    throw new Error("Temp user was not deleted");
  }
  console.log("STEP deleteUser: PASS (confirmed removed)");

  await mongoose.disconnect();
  console.log("ALL_CHECKS_PASSED");
  process.exit(0);
}

main().catch((err) => {
  console.error("VERIFY_FAILED:", redact(err));
  process.exit(1);
});
