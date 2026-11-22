import { Router } from "express";
import { body, param, query, type ValidationChain } from "express-validator";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  listMyProducts,
  listManagedProducts,
  reviewProduct,
} from "../controllers/product.controller";
import { optionalAuth } from "../middleware/optionalAuth.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { requireOwner } from "../middleware/owner.middleware";
import { APPROVAL_STATUSES } from "../models/Product";
import { validate } from "../middleware/validate.middleware";
import { isImageUrl } from "../utils/validators";

const router = Router();

function productFields(isCreate: boolean): ValidationChain[] {
  // Core fields are required on create and optional on update.
  const core = (rule: ValidationChain) => (isCreate ? rule : rule.optional());
  return [
    core(body("name").isString().trim().isLength({ min: 2, max: 120 }).withMessage("Name must be 2-120 characters")),
    core(body("category").isString().trim().toLowerCase().notEmpty().withMessage("Category is required")),
    core(body("price").isFloat({ min: 0 }).withMessage("Price must be 0 or more").toFloat()),
    core(body("mrp").isFloat({ min: 0 }).withMessage("MRP must be 0 or more").toFloat()),
    core(body("unit").isString().trim().isLength({ min: 1, max: 30 }).withMessage("Unit is required, e.g. 1 kg")),
    core(body("stock").isInt({ min: 0 }).withMessage("Stock must be a whole number, 0 or more").toInt()),
    body("nameTe").optional().isString().trim().isLength({ max: 120 }).withMessage("Telugu name can be up to 120 characters"),
    body("description").optional().isString().trim().isLength({ max: 3000 }),
    body("benefits").optional().isArray({ max: 20 }),
    body("benefits.*").isString().trim().isLength({ max: 120 }),
    body("sizes").optional().isArray({ max: 15 }).withMessage("Up to 15 sizes"),
    body("sizes.*").isString().trim().isLength({ max: 20 }).withMessage("Each size can be up to 20 characters"),
    body("image").optional().isString().trim().custom(isImageUrl).withMessage("Image must be an https:// URL"),
    // The main image plus these make at most 5 photos per product.
    body("images").optional().isArray({ max: 4 }).withMessage("Up to 5 photos per product"),
    body("images.*").isString().trim().custom(isImageUrl).withMessage("Images must be https:// URLs"),
    body("isOrganic").optional().isBoolean().toBoolean(),
    body("isFeatured").optional().isBoolean().toBoolean(),
    body("priceAvailable").optional().isBoolean().toBoolean(),
    body("priceLabel").optional().isString().trim().isLength({ max: 40 }),
    body("sellerId").optional().isMongoId().withMessage("Invalid seller id"),
  ];
}
const idParam = param("id").isMongoId().withMessage("Invalid product id");

router.get(
  "/",
  validate([
    query("seller").optional().isMongoId().withMessage("Invalid seller id"),
    query("minPrice").optional().isFloat({ min: 0 }),
    query("maxPrice").optional().isFloat({ min: 0 }),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1 }),
    query("search").optional().isString().isLength({ max: 100 }),
    query("category").optional().isString(),
    query("sort").optional().isString(),
  ]),
  listProducts
);
router.get("/mine", requireAuth, requireRole("seller"), listMyProducts);
router.get(
  "/manage",
  requireAuth,
  requireRole("admin"),
  validate([
    query("status").optional().isIn(APPROVAL_STATUSES).withMessage("Unknown status"),
    query("category").optional().isMongoId().withMessage("Invalid category id"),
  ]),
  listManagedProducts
);
router.get("/:idOrSlug", optionalAuth, getProduct);
router.post("/", requireAuth, requireRole("seller", "admin"), validate(productFields(true)), createProduct);
router.patch(
  "/:id",
  requireAuth,
  requireRole("seller", "admin"),
  validate([idParam, ...productFields(false)]),
  updateProduct
);
// Only the site owner reviews products; the role and decision come from the token and body, never trusted flags.
router.patch(
  "/:id/approval",
  requireAuth,
  requireRole("admin"),
  requireOwner,
  validate([
    idParam,
    body("decision").isIn(["approve", "reject"]).withMessage("Decision must be approve or reject"),
    body("reason")
      .if(body("decision").equals("reject"))
      .isString()
      .trim()
      .isLength({ min: 3, max: 300 })
      .withMessage("Give a reason (3-300 characters) so the seller can fix it"),
  ]),
  reviewProduct
);
router.delete("/:id", requireAuth, requireRole("seller", "admin"), validate([idParam]), deleteProduct);

export default router;
