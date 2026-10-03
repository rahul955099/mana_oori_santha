import { Router } from "express";
import { body, param, type ValidationChain } from "express-validator";
import { getCart, replaceCart, getWishlist, replaceWishlist } from "../controllers/cart.controller";
import {
  listAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../controllers/address.controller";
import { listCoupons, createCoupon, updateCoupon, deleteCoupon } from "../controllers/coupon.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { optionalAuth } from "../middleware/optionalAuth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";

/** Cart, wishlist, saved addresses and coupons — mounted at /api. */
const router = Router();

router.get("/cart", requireAuth, getCart);
router.put(
  "/cart",
  requireAuth,
  validate([
    body("items").isArray({ max: 100 }),
    body("items.*.productId").isString(),
    body("items.*.quantity").isInt({ min: 1, max: 99 }).toInt(),
    body("couponCode").optional({ values: "null" }).isString().trim().isLength({ max: 30 }),
  ]),
  replaceCart
);

router.get("/wishlist", requireAuth, getWishlist);
router.put(
  "/wishlist",
  requireAuth,
  validate([body("productIds").isArray({ max: 200 }), body("productIds.*").isString()]),
  replaceWishlist
);

function addressFields(isCreate: boolean): ValidationChain[] {
  const req = (field: string, label: string, max = 120) => {
    const rule = body(field).isString().trim().isLength({ min: 1, max }).withMessage(`${label} is required`);
    return isCreate ? rule : rule.optional();
  };
  const phone = body("phone")
    .isString()
    .trim()
    .matches(/^(\+91[\s-]?)?[6-9]\d{9}$/)
    .withMessage("A valid 10-digit mobile number is required");
  const pincode = body("pincode").isString().trim().matches(/^[1-9]\d{5}$/).withMessage("A valid 6-digit pincode is required");
  return [
    body("type").optional().isIn(["home", "work", "other"]),
    req("fullName", "Full name", 80),
    isCreate ? phone : phone.optional(),
    req("houseNo", "House / flat number"),
    req("street", "Street / area", 200),
    req("city", "City / village", 80),
    body("district").optional().isString().trim().isLength({ max: 80 }),
    req("state", "State", 80),
    isCreate ? pincode : pincode.optional(),
    body("landmark").optional().isString().trim().isLength({ max: 120 }),
  ];
}
const addressId = param("id").isMongoId().withMessage("Invalid address id");

router.get("/addresses", requireAuth, listAddresses);
router.post("/addresses", requireAuth, validate(addressFields(true)), addAddress);
router.patch("/addresses/:id", requireAuth, validate([addressId, ...addressFields(false)]), updateAddress);
router.delete("/addresses/:id", requireAuth, validate([addressId]), deleteAddress);
router.post("/addresses/:id/default", requireAuth, validate([addressId]), setDefaultAddress);

function couponFields(isCreate: boolean): ValidationChain[] {
  const core = (rule: ValidationChain) => (isCreate ? rule : rule.optional());
  const nullable = (field: string) => body(field).optional({ values: "null" });
  return [
    core(body("code").isString().trim().toUpperCase().matches(/^[A-Z0-9_-]{3,30}$/).withMessage("Code must be 3-30 letters or digits")),
    core(body("type").isIn(["percent", "flat"]).withMessage("Type must be percent or flat")),
    core(body("value").isFloat({ min: 1 }).withMessage("Value must be at least 1").toFloat()),
    body("description").optional().isString().trim().isLength({ max: 200 }),
    body("active").optional().isBoolean().toBoolean(),
    nullable("minOrderValue").isFloat({ min: 0 }).toFloat(),
    nullable("maxDiscount").isFloat({ min: 0 }).toFloat(),
    nullable("categoryOnly").isString().trim().toLowerCase().isLength({ max: 60 }),
    nullable("usageLimitPerUser").isInt({ min: 1 }).toInt(),
    nullable("expiresAt").isISO8601().toDate(),
  ];
}
const couponId = param("id").isMongoId().withMessage("Invalid coupon id");

router.get("/coupons", optionalAuth, listCoupons);
router.post("/coupons", requireAuth, requireRole("admin"), validate(couponFields(true)), createCoupon);
router.patch("/coupons/:id", requireAuth, requireRole("admin"), validate([couponId, ...couponFields(false)]), updateCoupon);
router.delete("/coupons/:id", requireAuth, requireRole("admin"), validate([couponId]), deleteCoupon);

export default router;
