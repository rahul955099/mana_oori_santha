import type { Response } from "express";
import { User } from "../models/User";
import { success } from "../utils/response";
import { diagnoseMail } from "../services/mail.service";
import type { AuthRequest } from "../middleware/auth.middleware";
import { AppError } from "../utils/AppError";

/** Sends a test email to the logged-in admin and reports exactly what happened. */
export async function emailCheck(req: AuthRequest, res: Response) {
  const admin = await User.findById(req.userId).select("email");
  if (!admin?.email) throw new AppError("Admin email is not configured", 400, "EMAIL_REQUIRED");
  const report = await diagnoseMail(admin.email);
  success(res, report.sent ? `Test email sent to ${admin.email}` : "Email check failed", { to: admin.email, ...report });
}
