import { Router } from "express";
import { body, param, query } from "express-validator";
import { listCustomers, setCustomerActive } from "../controllers/adminUser.controller";
import { downloadOrdersCsv, getSummary } from "../controllers/report.controller";
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
router.get("/reports/summary", validate(dateRange), getSummary);
router.get("/reports/orders.csv", validate(dateRange), downloadOrdersCsv);

export default router;
