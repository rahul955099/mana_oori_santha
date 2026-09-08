import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { verifyToken } from "../utils/jwt";
import type { UserRole } from "../models/User";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: UserRole;
}

/** Requires a valid `Authorization: Bearer <token>` header and attaches the
 * decoded userId/role to the request. Does not hit the database — routes
 * that need the full user record (e.g. /me) look it up themselves. */
export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
  }

  req.userId = payload.userId;
  req.userRole = payload.role;
  next();
}
