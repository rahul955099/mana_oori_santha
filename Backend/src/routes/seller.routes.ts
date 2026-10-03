import { Router } from "express";
import { body, param, type ValidationChain } from "express-validator";
import {
  listSellers,
  getSeller,
  getMySeller,
  updateMySeller,
  submitMyKyc,
  getMyEarnings,
  adminGetSellerKyc,
  adminGetSellerEarnings,
  adminUpdateSeller,
  adminSetSellerStatus,
  adminDeleteSeller,
} from "../controllers/seller.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { optionalAuth } from "../middleware/optionalAuth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import { GSTIN_PATTERN, IFSC_PATTERN, PAN_PATTERN, UPI_PATTERN, isImageUrl } from "../utils/validators";

const router = Router();

const text = (field: string, max: number) => body(field).optional().isString().trim().isLength({ max });

const profileFields: ValidationChain[] = [
  body("name").optional().isString().trim().isLength({ min: 2, max: 80 }).withMessage("Name must be 2-80 characters"),
  body("email").optional().isString().trim().toLowerCase().isEmail().withMessage("A valid email is required"),
  body("phone")
    .optional()
    .isString()
    .trim()
    .matches(/^(\+91[\s-]?)?[6-9]\d{4}\s?\d{5}$/)
    .withMessage("A valid 10-digit Indian mobile number is required"),
  body("farmName").optional().isString().trim().isLength({ min: 2, max: 120 }).withMessage("Shop / farm name is required"),
  text("location", 120),
  text("district", 80),
  text("state", 80),
  text("about", 2000),
  body("image").optional().isString().trim().custom(isImageUrl).withMessage("Shop photo must be an https:// URL"),
  text("farmingType", 80),
  body("experienceYears").optional().isInt({ min: 0, max: 100 }).toInt(),
  body("mainProducts").optional().isArray({ max: 20 }),
  body("mainProducts.*").isString().trim().isLength({ max: 60 }),
  body("photos").optional().isArray({ max: 12 }),
  body("photos.*").isString().trim().custom(isImageUrl).withMessage("Photos must be https:// URLs"),
];

const isUpi = (_: unknown, { req }: { req: unknown }) => (req as { body: { payout?: { method?: string } } }).body.payout?.method === "upi";
const isBank = (_: unknown, { req }: { req: unknown }) => (req as { body: { payout?: { method?: string } } }).body.payout?.method === "bank";

const kycFields: ValidationChain[] = [
  body("legalName").isString().trim().isLength({ min: 2, max: 120 }).withMessage("Legal name (as on PAN) is required"),
  body("pan").isString().trim().toUpperCase().matches(PAN_PATTERN).withMessage("Enter a valid PAN, e.g. ABCDE1234F"),
  body("gstin")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .toUpperCase()
    .matches(GSTIN_PATTERN)
    .withMessage("Enter a valid 15-character GSTIN, or leave it empty"),
  body("payout.method").isIn(["upi", "bank"]).withMessage("Choose UPI or bank account for payouts"),
  body("payout.upiId").if(isUpi).isString().trim().matches(UPI_PATTERN).withMessage("Enter a valid UPI ID, e.g. name@okbank"),
  body("payout.accountHolder").if(isBank).isString().trim().isLength({ min: 2, max: 120 }).withMessage("Account holder name is required"),
  body("payout.accountNumber").if(isBank).isString().trim().matches(/^\d{9,18}$/).withMessage("Account number must be 9-18 digits"),
  body("payout.ifsc").if(isBank).isString().trim().toUpperCase().matches(IFSC_PATTERN).withMessage("Enter a valid IFSC, e.g. SBIN0001234"),
  body("payout.bankName").optional().isString().trim().isLength({ max: 120 }),
];

const idParam = param("id").isMongoId().withMessage("Invalid seller id");
const admin = [requireAuth, requireRole("admin")];

router.get("/", optionalAuth, listSellers);
// "/me" routes must be registered before "/:id" so "me" is not treated as an id.
router.get("/me", requireAuth, requireRole("seller"), getMySeller);
router.patch("/me", requireAuth, requireRole("seller"), validate(profileFields), updateMySeller);
router.put("/me/kyc", requireAuth, requireRole("seller"), validate(kycFields), submitMyKyc);
router.get("/me/earnings", requireAuth, requireRole("seller"), getMyEarnings);

router.get("/:id", optionalAuth, validate([idParam]), getSeller);
router.get("/:id/kyc", ...admin, validate([idParam]), adminGetSellerKyc);
router.get("/:id/earnings", ...admin, validate([idParam]), adminGetSellerEarnings);
router.patch(
  "/:id",
  ...admin,
  validate([idParam, body("verified").optional().isBoolean().toBoolean(), ...profileFields]),
  adminUpdateSeller
);
router.patch(
  "/:id/status",
  ...admin,
  validate([
    idParam,
    body("status").isIn(["pending", "approved", "rejected", "suspended"]).withMessage("Unknown seller status"),
    body("reason").optional().isString().trim().isLength({ max: 300 }),
  ]),
  adminSetSellerStatus
);
router.delete("/:id", ...admin, validate([idParam]), adminDeleteSeller);

export default router;
