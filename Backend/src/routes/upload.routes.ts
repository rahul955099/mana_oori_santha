import { Router } from "express";
import { body } from "express-validator";
import { getUploadSignature } from "../controllers/upload.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";

const router = Router();

router.post(
  "/signature",
  requireAuth,
  validate([body("purpose").isIn(["product", "seller", "profile"]).withMessage("Unknown upload type")]),
  getUploadSignature
);

export default router;
