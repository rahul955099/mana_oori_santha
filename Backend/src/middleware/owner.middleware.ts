import type { NextFunction, Response } from "express";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import type { AuthRequest } from "./auth.middleware";

/** Use after requireAuth. Only the site owner (the super admin) may continue. */
export async function requireOwner(req: AuthRequest, _res: Response, next: NextFunction) {
  const user = await User.findById(req.userId).select("role isOwner");
  if (!user || user.role !== "admin" || !user.isOwner) {
    throw new AppError("Only the site owner can do this.", 403, "OWNER_ONLY");
  }
  next();
}
