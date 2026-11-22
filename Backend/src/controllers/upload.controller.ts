import type { Response } from "express";
import { AppError } from "../utils/AppError";
import { success } from "../utils/response";
import { cloudinaryConfigured, createUploadSignature, missingCloudinaryKeys } from "../services/cloudinary.service";
import type { AuthRequest } from "../middleware/auth.middleware";

/** Who may upload each kind of image. */
const PURPOSES: Record<string, string[]> = {
  product: ["seller", "admin"],
  seller: ["seller", "admin"],
  profile: ["customer", "seller", "admin"],
};

export async function getUploadSignature(req: AuthRequest, res: Response) {
  const purpose = String(req.body.purpose);
  if (!PURPOSES[purpose]?.includes(req.userRole!)) {
    throw new AppError("You can't upload this kind of image.", 403, "FORBIDDEN");
  }
  if (!cloudinaryConfigured()) {
    // Admins can fix this themselves, so they get the setup steps; everyone else gets a plain apology.
    throw new AppError(
      req.userRole === "admin"
        ? `Image uploads aren't set up yet. Add ${missingCloudinaryKeys().join(", ")} to the API's environment (Backend/.env, or the hosting settings) and restart the API. Until then, use "Paste a link instead".`
        : "Photo uploads aren't available right now. Please try again later.",
      503,
      "UPLOADS_NOT_CONFIGURED"
    );
  }
  // One folder per user keeps uploads traceable to whoever made them.
  success(res, "Upload signature created", createUploadSignature(`mana-oori-santha/${purpose}/${req.userId}`));
}
