import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { UserRole } from "../models/User";

export interface JwtPayload {
  userId: string;
  role: UserRole;
  /** Issued-at, in seconds (added by jsonwebtoken). */
  iat?: number;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
