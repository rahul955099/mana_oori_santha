import { Router } from "express";
import { body } from "express-validator";
import { listBalances, recordPayout } from "../controllers/payout.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/balances", listBalances);
router.post(
  "/",
  validate([
    body("sellerId").isMongoId().withMessage("Choose a seller"),
    body("amount").isFloat({ min: 1 }).withMessage("Amount must be at least ₹1").toFloat(),
    body("method").isIn(["upi", "bank", "cash"]).withMessage("Choose how the seller was paid"),
    body("reference").isString().trim().isLength({ min: 3, max: 80 }).withMessage("Enter the UTR / transaction reference"),
    body("note").optional().isString().trim().isLength({ max: 300 }),
    body("paidAt").optional().isISO8601().toDate(),
  ]),
  recordPayout
);

export default router;
