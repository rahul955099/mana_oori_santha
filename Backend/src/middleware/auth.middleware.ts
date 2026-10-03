import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { verifyToken } from "../utils/jwt";
import { User, type UserRole } from "../models/User";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: UserRole;
}

/** Requires a valid `Authorization: Bearer <token>` header and attaches the
 * userId/role to the request. The user is re-read from the database so a
 * deactivated account or a changed role takes effect immediately rather than
 * when the token expires. */
export async function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
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

  const user = await User.findById(payload.userId).select("role isActive passwordChangedAt");
  if (!user || !user.isActive) {
    throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
  }
  // A password change or reset signs out sessions that started before it.
  if (user.passwordChangedAt && (payload.iat ?? 0) * 1000 < user.passwordChangedAt.getTime()) {
    throw new AppError("Your session has expired. Please log in again.", 401, "INVALID_TOKEN");
  }

  req.userId = user._id.toString();
  req.userRole = user.role;
  next();
}
