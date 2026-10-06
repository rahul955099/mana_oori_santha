import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import { runMigrations } from "./config/migrations";
import { expireStaleAssignments } from "./services/delivery.service";

async function start() {
  try {
    await connectDB();
    await runMigrations();
    // Deliveries a partner didn't accept in time go back to the admins.
    setInterval(() => {
      expireStaleAssignments().catch((err) => console.error("Delivery expiry failed:", err instanceof Error ? err.message : err));
    }, 5 * 60 * 1000);
    app.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
