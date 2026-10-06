import { Router } from "express";
import { body, param, query } from "express-validator";
import { deleteCustomer, listCustomers, setCustomerActive } from "../controllers/adminUser.controller";
import { downloadOrdersCsv, getSummary } from "../controllers/report.controller";
import { emailCheck } from "../controllers/adminMail.controller";
import { addAdmin, cancelInvite, getTeam, removeAdmin, resendInvite, transferOwnership } from "../controllers/team.controller";
import { requireOwner } from "../middleware/owner.middleware";
import {
  assign,
  cancelPartnerInvite,
  getSettings,
  getSuggestions,
  grantAttemptFee,
  invitePartner,
  listPartners,
  listSettlements,
  recordSettlement,
  resendPartnerInvite,
  resolveAttention,
  saveSettings,
  unassign,
  updatePartner,
} from "../controllers/adminDelivery.controller";
import { VEHICLES } from "../models/DeliveryPartner";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";

/** Admin-only tools — mounted at /api/admin. */
const router = Router();
router.use(requireAuth, requireRole("admin"));

const dateRange = [
  query("from").optional().isISO8601({ strict: true }).withMessage("from must be a date like 2026-10-01"),
  query("to").optional().isISO8601({ strict: true }).withMessage("to must be a date like 2026-10-31"),
];

router.get("/users", validate([query("search").optional().isString().isLength({ max: 80 })]), listCustomers);
router.patch(
  "/users/:id",
  validate([param("id").isMongoId().withMessage("Invalid user id"), body("isActive").isBoolean().toBoolean()]),
  setCustomerActive
);
router.delete("/users/:id", validate([param("id").isMongoId().withMessage("Invalid user id")]), deleteCustomer);
router.get("/reports/summary", validate(dateRange), getSummary);
router.get("/reports/orders.csv", validate(dateRange), downloadOrdersCsv);
router.post("/email-check", emailCheck);

// ---- Delivery partners ----
const orderNumber = param("orderNumber").matches(/^MOS-\d+$/).withMessage("Invalid order number");
const areas = body("serviceAreas").optional().custom((v) => Array.isArray(v) || typeof v === "string").withMessage("Areas must be pincodes");
const money = (field: string) => body(field).optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage(`${field} must be an amount`).toFloat();

router.get("/delivery/partners", listPartners);
router.post(
  "/delivery/partners/invite",
  validate([
    body("email").isString().trim().toLowerCase().isEmail().withMessage("Enter a valid email"),
    body("vehicle").isIn(VEHICLES).withMessage("Choose bike, auto or van"),
    areas,
  ]),
  invitePartner
);
const inviteIdParam = param("inviteId").isMongoId().withMessage("Invalid invitation");
router.post("/delivery/invites/:inviteId/resend", validate([inviteIdParam]), resendPartnerInvite);
router.delete("/delivery/invites/:inviteId", validate([inviteIdParam]), cancelPartnerInvite);
router.patch(
  "/delivery/partners/:partnerId",
  validate([
    param("partnerId").isMongoId().withMessage("Invalid partner"),
    body("vehicle").optional().isIn(VEHICLES),
    areas,
    body("isActive").optional().isBoolean().toBoolean(),
  ]),
  updatePartner
);
router.get("/delivery/orders/:orderNumber/suggestions", validate([orderNumber]), getSuggestions);
router.post(
  "/delivery/assign",
  validate([
    body("orderNumbers").isArray({ min: 1, max: 50 }).withMessage("Choose at least one order"),
    body("orderNumbers.*").isString().matches(/^MOS-\d+$/),
    body("partnerId").isMongoId().withMessage("Choose a delivery partner"),
  ]),
  assign
);
router.post("/delivery/orders/:orderNumber/unassign", validate([orderNumber]), unassign);
router.post("/delivery/orders/:orderNumber/resolve", validate([orderNumber]), resolveAttention);
router.patch(
  "/delivery/orders/:orderNumber/attempts/:index/fee",
  validate([orderNumber, param("index").isInt({ min: 0 }).toInt(), body("fee").isFloat({ min: 0, max: 1000 }).toFloat()]),
  grantAttemptFee
);
router.get("/delivery/settings", getSettings);
// Fees, limits and money are the owner's.
router.put(
  "/delivery/settings",
  requireOwner,
  validate([
    body("feePerDelivery").optional().isFloat({ min: 0, max: 5000 }).toFloat(),
    body("extraPickupFee").optional().isFloat({ min: 0, max: 5000 }).toFloat(),
    body("maxActiveDeliveries").optional().isInt({ min: 1, max: 200 }).toInt(),
    body("cashLimit").optional().isFloat({ min: 0, max: 10000000 }).toFloat(),
    body("acceptWithinMinutes").optional().isInt({ min: 5, max: 1440 }).toInt(),
  ]),
  saveSettings
);
router.get("/delivery/settlements", requireOwner, listSettlements);
router.post(
  "/delivery/settlements",
  requireOwner,
  validate([
    body("partnerId").isMongoId().withMessage("Choose a delivery partner"),
    money("cashReceived"),
    money("feesPaid"),
    body("method").isIn(["cash", "upi", "bank"]).withMessage("Choose how the money moved"),
    body("reference").optional().isString().trim().isLength({ max: 80 }),
    body("note").optional().isString().trim().isLength({ max: 300 }),
    body("at").optional().isISO8601().toDate(),
  ]),
  recordSettlement
);

// Managing the admin team is for the site owner only.
router.get("/team", requireOwner, getTeam);
router.post(
  "/team",
  requireOwner,
  validate([body("email").isString().trim().toLowerCase().isEmail().withMessage("Enter a valid email address")]),
  addAdmin
);
router.post(
  "/team/transfer-ownership",
  requireOwner,
  validate([body("userId").isMongoId().withMessage("Choose an admin")]),
  transferOwnership
);
router.delete("/team/:userId", requireOwner, validate([param("userId").isMongoId().withMessage("Invalid user id")]), removeAdmin);
const inviteId = param("inviteId").isMongoId().withMessage("Invalid invitation id");
router.post("/team/invites/:inviteId/resend", requireOwner, validate([inviteId]), resendInvite);
router.delete("/team/invites/:inviteId", requireOwner, validate([inviteId]), cancelInvite);

export default router;
