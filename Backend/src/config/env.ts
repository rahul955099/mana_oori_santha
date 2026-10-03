import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Fail fast on a weak signing key in production rather than issuing forgeable logins.
if (process.env.NODE_ENV === "production" && (process.env.JWT_SECRET ?? "").length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters in production");
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  mongodbUri: required("MONGODB_URI"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  /** The website's main address, used in email links and the sitemap. */
  clientUrl: (process.env.CLIENT_URL ?? "http://localhost:5173").split(",")[0].trim(),
  /** Every address allowed to call the API: CLIENT_URL may list several,
   * comma-separated (e.g. the custom domain and the host's default address). */
  corsOrigins: (process.env.CLIENT_URL ?? "http://localhost:5173")
    .split(",")
    .map((u) => u.trim().replace(/\/$/, ""))
    .filter(Boolean),
  /** Percent of each seller sale kept by the platform. Snapshotted onto each order. */
  commissionPercent: Number(process.env.PLATFORM_COMMISSION_PERCENT ?? 5),
  /** Outgoing email (e.g. Brevo SMTP). Without these, emails are logged instead of sent. */
  smtp: {
    host: process.env.SMTP_HOST?.trim() ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER?.trim() ?? "",
    pass: process.env.SMTP_PASS?.trim() ?? "",
    from: process.env.MAIL_FROM?.trim() ?? "",
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY?.trim() ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET?.trim() ?? "",
  },
};
