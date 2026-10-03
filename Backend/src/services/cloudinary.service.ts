import crypto from "node:crypto";
import { env } from "../config/env";

export function cloudinaryConfigured(): boolean {
  const c = env.cloudinary;
  return Boolean(c.cloudName && c.apiKey && c.apiSecret);
}

/** Cloudinary's upload signature: SHA-1 of the alphabetically sorted
 * "key=value" pairs joined with "&", followed by the API secret. */
export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const payload = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(payload + apiSecret).digest("hex");
}

/** Everything the browser needs for one direct upload to Cloudinary. The
 * signature pins the folder and allowed formats, and Cloudinary rejects it
 * after about an hour. */
export function createUploadSignature(folder: string) {
  const params = {
    allowed_formats: "jpg,jpeg,png,webp",
    folder,
    timestamp: Math.floor(Date.now() / 1000),
  };
  return {
    cloudName: env.cloudinary.cloudName,
    apiKey: env.cloudinary.apiKey,
    ...params,
    signature: signParams(params, env.cloudinary.apiSecret),
  };
}
