import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import { runMigrations } from "./config/migrations";

async function start() {
  try {
    await connectDB();
    await runMigrations();
    app.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
