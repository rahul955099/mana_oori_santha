import type { NextFunction, Response } from "express";
import { AppError } from "../utils/AppError";
import type { UserRole } from "../models/User";
import type { AuthRequest } from "./auth.middleware";

/** Use after requireAuth. Rejects callers whose role is not in `roles`. */
export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      throw new AppError("You do not have permission to do this", 403, "FORBIDDEN");
    }
    next();
  };
}
