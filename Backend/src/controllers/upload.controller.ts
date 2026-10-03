import type { Response } from "express";
import { AppError } from "../utils/AppError";
import { success } from "../utils/response";
import { cloudinaryConfigured, createUploadSignature } from "../services/cloudinary.service";
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
    throw new AppError(
      "Image uploads aren't set up yet. Ask the site admin to add the Cloudinary keys.",
      503,
      "UPLOADS_NOT_CONFIGURED"
    );
  }
  // One folder per user keeps uploads traceable to whoever made them.
  success(res, "Upload signature created", createUploadSignature(`mana-oori-santha/${purpose}/${req.userId}`));
}
