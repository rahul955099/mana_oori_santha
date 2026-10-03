import crypto from "node:crypto";

/** A random one-time token for email links. Only its hash is stored, so a
 * database leak doesn't expose usable links. */
export function createOneTimeToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
