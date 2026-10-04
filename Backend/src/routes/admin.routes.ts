import { Router } from "express";
import { body, param, query } from "express-validator";
import { deleteCustomer, listCustomers, setCustomerActive } from "../controllers/adminUser.controller";
import { downloadOrdersCsv, getSummary } from "../controllers/report.controller";
import { emailCheck } from "../controllers/adminMail.controller";
import { addAdmin, cancelInvite, getTeam, removeAdmin, resendInvite, transferOwnership } from "../controllers/team.controller";
import { requireOwner } from "../middleware/owner.middleware";
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
