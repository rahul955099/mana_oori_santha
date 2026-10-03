import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  mongodbUri: required("MONGODB_URI"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
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
