import { Router } from "express";
import { body, param } from "express-validator";
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { optionalAuth } from "../middleware/optionalAuth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";

const router = Router();

const fields = (isCreate: boolean) => {
  const nameRule = body("name").isString().trim().isLength({ min: 2, max: 60 }).withMessage("Name must be 2-60 characters");
  return [
    isCreate ? nameRule : nameRule.optional(),
    body("slug").optional().isString().trim().isLength({ min: 2, max: 60 }),
    body("description").optional().isString().trim().isLength({ max: 500 }),
    body("image").optional().isString().trim().isLength({ max: 1000 }),
    body("sortOrder").optional().isInt().toInt(),
    body("isActive").optional().isBoolean().toBoolean(),
  ];
};
const idParam = param("id").isMongoId().withMessage("Invalid category id");

router.get("/", optionalAuth, listCategories);
router.get("/:slug", getCategory);
router.post("/", requireAuth, requireRole("admin"), validate(fields(true)), createCategory);
router.patch("/:id", requireAuth, requireRole("admin"), validate([idParam, ...fields(false)]), updateCategory);
router.delete("/:id", requireAuth, requireRole("admin"), validate([idParam]), deleteCategory);

export default router;
