import { Router } from "express";
import { body, param, type ValidationChain } from "express-validator";
import {
  listSellers,
  getSeller,
  getMySeller,
  updateMySeller,
  adminUpdateSeller,
  adminDeleteSeller,
} from "../controllers/seller.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";

const router = Router();

const text = (field: string, max: number) => body(field).optional().isString().trim().isLength({ max });

const profileFields: ValidationChain[] = [
  body("name").optional().isString().trim().isLength({ min: 2, max: 80 }).withMessage("Name must be 2-80 characters"),
  body("email").optional().isString().trim().toLowerCase().isEmail().withMessage("A valid email is required"),
  body("phone")
    .optional()
    .isString()
    .trim()
    .matches(/^(\+91[\s-]?)?[6-9]\d{4}\s?\d{5}$/)
    .withMessage("A valid 10-digit Indian mobile number is required"),
  body("farmName").optional().isString().trim().isLength({ min: 2, max: 120 }).withMessage("Shop / farm name is required"),
  text("location", 120),
  text("district", 80),
  text("state", 80),
  text("about", 2000),
  text("image", 1000),
  text("farmingType", 80),
  body("experienceYears").optional().isInt({ min: 0, max: 100 }).toInt(),
  body("mainProducts").optional().isArray({ max: 20 }),
  body("mainProducts.*").isString().trim().isLength({ max: 60 }),
  body("photos").optional().isArray({ max: 12 }),
  body("photos.*").isString().trim().isLength({ max: 1000 }),
];
const idParam = param("id").isMongoId().withMessage("Invalid seller id");

router.get("/", listSellers);
// "/me" must be registered before "/:id" so it is not treated as an id.
router.get("/me", requireAuth, requireRole("seller"), getMySeller);
router.patch("/me", requireAuth, requireRole("seller"), validate(profileFields), updateMySeller);
router.get("/:id", validate([idParam]), getSeller);
router.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validate([idParam, body("verified").optional().isBoolean().toBoolean(), ...profileFields]),
  adminUpdateSeller
);
router.delete("/:id", requireAuth, requireRole("admin"), validate([idParam]), adminDeleteSeller);

export default router;
