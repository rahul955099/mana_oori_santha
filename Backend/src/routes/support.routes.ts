import { Router } from "express";
import { body, param, query } from "express-validator";
import {
  createTicket,
  listMyTickets,
  getTicket,
  replyToTicket,
  adminListTickets,
  adminSetTicketStatus,
} from "../controllers/support.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import { SUPPORT_CATEGORIES, SUPPORT_STATUSES } from "../models/SupportTicket";

const router = Router();
router.use(requireAuth);

const ticketParam = param("ticketNumber").matches(/^SUP-\d+$/).withMessage("Invalid support request number");
const message = (field: string) =>
  body(field).isString().trim().isLength({ min: 5, max: 2000 }).withMessage("Please write at least a few words (up to 2000 characters)");

router.post(
  "/",
  validate([
    body("category").isIn(SUPPORT_CATEGORIES).withMessage("Choose what you need help with"),
    message("message"),
    body("orderId").optional({ values: "falsy" }).isString().trim().matches(/^MOS-\d+$/).withMessage("Invalid order number"),
  ]),
  createTicket
);
router.get("/mine", listMyTickets);
router.get(
  "/",
  requireRole("admin"),
  validate([query("status").optional().isIn(SUPPORT_STATUSES), query("search").optional().isString().isLength({ max: 80 })]),
  adminListTickets
);
router.get("/:ticketNumber", validate([ticketParam]), getTicket);
router.post("/:ticketNumber/replies", validate([ticketParam, message("message")]), replyToTicket);
router.patch(
  "/:ticketNumber/status",
  requireRole("admin"),
  validate([ticketParam, body("status").isIn(SUPPORT_STATUSES).withMessage("Unknown status")]),
  adminSetTicketStatus
);

export default router;
