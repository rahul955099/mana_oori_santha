import { Router } from "express";
import { body } from "express-validator";
import {
  register,
  registerSeller,
  login,
  me,
  updateMe,
  changePassword,
  deleteMe,
  confirmEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { isImageUrl } from "../utils/validators";

const router = Router();

/** Tighter limit for endpoints attackers would hammer (password guessing, email spam). */
const sensitive = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.nodeEnv === "test",
  message: { success: false, message: "Too many attempts. Please wait a few minutes and try again.", error: "RATE_LIMITED" },
});

const email = () => body("email").isString().trim().toLowerCase().isEmail().withMessage("A valid email is required");
const phone = () =>
  body("phone")
    .isString()
    .trim()
    .matches(/^(\+91[\s-]?)?[6-9]\d{4}\s?\d{5}$/)
    .withMessage("A valid 10-digit Indian mobile number is required");
const name = () => body("name").isString().trim().isLength({ min: 2, max: 80 }).withMessage("Name must be 2-80 characters");
const newPassword = (field: string) =>
  body(field).isString().isLength({ min: 6, max: 128 }).withMessage("Password must be at least 6 characters");

router.post("/register", sensitive, validate([name(), email(), phone(), newPassword("password")]), register);

router.post(
  "/register/seller",
  sensitive,
  validate([
    name(),
    email(),
    phone(),
    newPassword("password"),
    body("shopName").isString().trim().isLength({ min: 2, max: 120 }).withMessage("Shop / farm name is required"),
    body("location").isString().trim().isLength({ min: 2, max: 120 }).withMessage("Location is required"),
  ]),
  registerSeller
);

router.post(
  "/login",
  sensitive,
  validate([email(), body("password").isString().notEmpty().withMessage("Password is required")]),
  login
);

router.get("/me", requireAuth, me);

router.patch(
  "/me",
  requireAuth,
  validate([
    name().optional(),
    email().optional(),
    phone().optional(),
    body("notificationPrefs").optional().isObject(),
    body("notificationPrefs.orderUpdates").optional().isBoolean().toBoolean(),
    body("notificationPrefs.deliveryAlerts").optional().isBoolean().toBoolean(),
    body("notificationPrefs.promotions").optional().isBoolean().toBoolean(),
    body("profileImage").optional().isString().trim().custom(isImageUrl).withMessage("Profile photo must be an https:// URL"),
  ]),
  updateMe
);

router.patch(
  "/me/password",
  requireAuth,
  validate([
    body("currentPassword").isString().notEmpty().withMessage("Current password is required"),
    newPassword("newPassword"),
  ]),
  changePassword
);

router.delete("/me", requireAuth, deleteMe);

const tokenRule = body("token").isString().isLength({ min: 64, max: 64 }).withMessage("This link is invalid");
router.post("/verify-email", validate([tokenRule]), confirmEmail);
router.post("/verify-email/resend", requireAuth, sensitive, resendVerification);
router.post("/forgot-password", sensitive, validate([email()]), forgotPassword);
router.post("/reset-password", sensitive, validate([tokenRule, newPassword("password")]), resetPassword);

export default router;
