import { Router } from "express";
import { body, param } from "express-validator";
import { broadcast, listBroadcasts, listMyNotifications, markAllRead, markRead } from "../controllers/notification.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";

const router = Router();
router.use(requireAuth);

router.get("/", listMyNotifications);
router.post("/read-all", markAllRead);
router.get("/broadcasts", requireRole("admin"), listBroadcasts);
router.post(
  "/broadcast",
  requireRole("admin"),
  validate([
    body("title").isString().trim().isLength({ min: 3, max: 100 }).withMessage("Title must be 3-100 characters"),
    body("message").isString().trim().isLength({ min: 5, max: 1000 }).withMessage("Message must be 5-1000 characters"),
    body("email").optional().isBoolean().toBoolean(),
  ]),
  broadcast
);
router.patch("/:id/read", validate([param("id").isMongoId().withMessage("Invalid notification id")]), markRead);

export default router;
