import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware";
import authRoutes from "./routes/auth.routes";
import categoryRoutes from "./routes/category.routes";
import productRoutes from "./routes/product.routes";
import sellerRoutes from "./routes/seller.routes";
import orderRoutes from "./routes/order.routes";
import shoppingRoutes from "./routes/shopping.routes";
import payoutRoutes from "./routes/payout.routes";
import uploadRoutes from "./routes/upload.routes";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
// Images go straight from the browser to Cloudinary, so request bodies stay small.
app.use(express.json({ limit: "200kb" }));
if (env.nodeEnv !== "test") {
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "Mana Oori Santha API is running", data: { env: env.nodeEnv } });
});

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sellers", sellerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payouts", payoutRoutes);
app.use("/api/uploads", uploadRoutes);
// /api/cart, /api/wishlist, /api/addresses, /api/coupons
app.use("/api", shoppingRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
