import { Router } from "express";
import { body, param, query } from "express-validator";
import {
  quote,
  createOrder,
  listMyOrders,
  listSellerOrders,
  listAllOrders,
  getOrder,
  updateOrderStatus,
} from "../controllers/order.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { optionalAuth } from "../middleware/optionalAuth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import { ORDER_STATUSES } from "../models/Order";

const router = Router();

const itemRules = [
  body("items").isArray({ min: 1, max: 100 }).withMessage("Your cart is empty"),
  body("items.*.productId").isMongoId().withMessage("Invalid product in cart"),
  body("items.*.quantity").isInt({ min: 1, max: 99 }).withMessage("Quantity must be between 1 and 99").toInt(),
  body("couponCode").optional({ values: "falsy" }).isString().trim().isLength({ max: 30 }),
];

const shipping = (field: string, label: string, max = 200) =>
  body(`shippingAddress.${field}`).isString().trim().isLength({ min: 1, max }).withMessage(`${label} is required`);

const orderNumberParam = param("orderNumber").matches(/^MOS-\d+$/).withMessage("Invalid order number");

router.post("/quote", optionalAuth, validate(itemRules), quote);

router.post(
  "/",
  requireAuth,
  validate([
    ...itemRules,
    shipping("fullName", "Full name", 80),
    body("shippingAddress.mobile")
      .isString()
      .trim()
      .matches(/^(\+91[\s-]?)?[6-9]\d{9}$/)
      .withMessage("A valid 10-digit mobile number is required"),
    body("shippingAddress.email").isString().trim().toLowerCase().isEmail().withMessage("A valid email is required"),
    shipping("address", "Address"),
    shipping("village", "Village / town", 80),
    body("shippingAddress.district").optional().isString().trim().isLength({ max: 80 }),
    shipping("state", "State", 80),
    body("shippingAddress.pincode").isString().trim().matches(/^\d{6}$/).withMessage("A 6-digit pincode is required"),
  ]),
  createOrder
);

router.get("/mine", requireAuth, listMyOrders);
router.get("/seller", requireAuth, requireRole("seller"), listSellerOrders);
router.get(
  "/",
  requireAuth,
  requireRole("admin"),
  validate([
    query("status").optional().isIn(ORDER_STATUSES),
    query("search").optional().isString().isLength({ max: 80 }),
  ]),
  listAllOrders
);
router.get("/:orderNumber", requireAuth, validate([orderNumberParam]), getOrder);
router.patch(
  "/:orderNumber/status",
  requireAuth,
  validate([
    orderNumberParam,
    body("status").isIn(ORDER_STATUSES).withMessage("Unknown order status"),
    body("note").optional().isString().trim().isLength({ max: 300 }),
  ]),
  updateOrderStatus
);

export default router;
