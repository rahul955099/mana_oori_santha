import { Router } from "express";
import { body, param, query } from "express-validator";
import {
  listProductReviews,
  upsertMyReview,
  deleteMyReview,
  adminListReviews,
  listMyReviews,
  adminModerateReview,
  adminDeleteReview,
} from "../controllers/review.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { optionalAuth } from "../middleware/optionalAuth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";

/** Mounted at /api. */
const router = Router();

const productId = param("id").isMongoId().withMessage("Invalid product id");
const reviewId = param("reviewId").isMongoId().withMessage("Invalid review id");
const admin = [requireAuth, requireRole("admin")];

router.get("/products/:id/reviews", optionalAuth, validate([productId]), listProductReviews);
router.put(
  "/products/:id/reviews/mine",
  requireAuth,
  validate([
    productId,
    body("rating").isInt({ min: 1, max: 5 }).withMessage("Choose a rating from 1 to 5 stars").toInt(),
    body("comment").optional().isString().trim().isLength({ max: 1000 }).withMessage("Reviews can be up to 1000 characters"),
  ]),
  upsertMyReview
);
router.delete("/products/:id/reviews/mine", requireAuth, validate([productId]), deleteMyReview);

router.get("/reviews/mine", requireAuth, listMyReviews);
router.get(
  "/reviews",
  ...admin,
  validate([
    query("status").optional().isIn(["published", "hidden"]),
    query("rating").optional().isInt({ min: 1, max: 5 }),
    query("search").optional().isString().isLength({ max: 80 }),
  ]),
  adminListReviews
);
router.patch(
  "/reviews/:reviewId",
  ...admin,
  validate([
    reviewId,
    body("status").isIn(["published", "hidden"]).withMessage("Status must be published or hidden"),
    body("note").optional().isString().trim().isLength({ max: 300 }),
  ]),
  adminModerateReview
);
router.delete("/reviews/:reviewId", ...admin, validate([reviewId]), adminDeleteReview);

export default router;
