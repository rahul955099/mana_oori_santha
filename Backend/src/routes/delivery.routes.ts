import { Router } from "express";
import { body, param } from "express-validator";
import { accept, decline, deliver, fail, getMe, listJobs, pickUp, setAvailability } from "../controllers/delivery.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";

const router = Router();

router.use(requireAuth, requireRole("delivery"));

const orderNumber = param("orderNumber").matches(/^MOS-\d+$/).withMessage("Invalid order number");

router.get("/me", getMe);
router.patch("/me/availability", validate([body("available").isBoolean().withMessage("Say whether you're available").toBoolean()]), setAvailability);
router.get("/orders", listJobs);
router.post("/orders/:orderNumber/accept", validate([orderNumber]), accept);
router.post(
  "/orders/:orderNumber/decline",
  validate([orderNumber, body("reason").optional().isString().trim().isLength({ max: 200 })]),
  decline
);
router.post("/orders/:orderNumber/pickup", validate([orderNumber]), pickUp);
router.post(
  "/orders/:orderNumber/deliver",
  validate([
    orderNumber,
    body("code").isString().trim().matches(/^\d{4}$/).withMessage("Enter the customer's 4-digit code"),
    body("cashCollected").isFloat({ min: 0 }).withMessage("Enter the cash you collected").toFloat(),
  ]),
  deliver
);
router.post(
  "/orders/:orderNumber/fail",
  validate([
    orderNumber,
    body("reason").isString().trim().isLength({ min: 2, max: 120 }).withMessage("Choose what went wrong"),
    body("note").optional().isString().trim().isLength({ max: 300 }),
  ]),
  fail
);

export default router;
