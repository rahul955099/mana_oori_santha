import type { NextFunction, Response } from "express";
import { requireAuth, type AuthRequest } from "./auth.middleware";

/** Attaches userId/role when a valid token is sent, but lets anonymous
 * requests through. Used by public endpoints that show more to admins/owners. */
export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.headers.authorization) {
    return next();
  }
  try {
    await requireAuth(req, res, () => undefined);
  } catch {
    // An invalid token on a public route is treated as anonymous.
    req.userId = undefined;
    req.userRole = undefined;
  }
  next();
}
