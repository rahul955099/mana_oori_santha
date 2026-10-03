import type { Request, Response } from "express";
import { Types } from "mongoose";
import { Seller, type SellerDocument } from "../models/Seller";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { AppError } from "../utils/AppError";
import { success } from "../utils/response";
import { toSeller } from "../utils/serialize";
import type { AuthRequest } from "../middleware/auth.middleware";

const USER_FIELDS = "name email phone";

/** Fields of the shop profile a seller may edit about themselves. */
const PROFILE_FIELDS = [
  "farmName",
  "location",
  "district",
  "state",
  "about",
  "image",
  "farmingType",
  "experienceYears",
  "mainProducts",
  "photos",
] as const;

async function productCounts(sellerIds: Types.ObjectId[]): Promise<Map<string, number>> {
  const rows = await Product.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { isActive: true, seller: { $in: sellerIds } } },
    { $group: { _id: "$seller", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), r.count]));
}

async function serializeOne(seller: SellerDocument) {
  await seller.populate("user", USER_FIELDS);
  const counts = await productCounts([seller._id]);
  return toSeller(seller, counts.get(seller._id.toString()) ?? 0);
}

/** Applies profile edits plus the linked user's name/email/phone. */
async function applyProfileUpdates(seller: SellerDocument, body: Record<string, unknown>) {
  // User fields go first so an email clash rejects the whole update.
  const userUpdates: Record<string, unknown> = {};
  for (const field of ["name", "phone", "email"] as const) {
    if (body[field] !== undefined) userUpdates[field] = body[field];
  }
  if (Object.keys(userUpdates).length > 0) {
    if (userUpdates.email) {
      const clash = await User.findOne({ email: userUpdates.email, _id: { $ne: seller.user } });
      if (clash) {
        throw new AppError("An account with this email already exists", 409, "DUPLICATE_EMAIL");
      }
    }
    await User.updateOne({ _id: seller.user }, userUpdates, { runValidators: true });
  }

  for (const field of PROFILE_FIELDS) {
    if (body[field] !== undefined) {
      seller.set(field, body[field]);
    }
  }
  await seller.save();
}

export async function listSellers(_req: Request, res: Response) {
  const sellers = await Seller.find({ isActive: true }).sort({ verified: -1, rating: -1 }).populate("user", USER_FIELDS);
  const counts = await productCounts(sellers.map((s) => s._id));
  success(res, "Sellers fetched", {
    sellers: sellers.map((s) => toSeller(s, counts.get(s._id.toString()) ?? 0)),
  });
}

export async function getSeller(req: Request, res: Response) {
  const seller = await Seller.findOne({ _id: req.params.id, isActive: true });
  if (!seller) {
    throw new AppError("Seller not found", 404, "NOT_FOUND");
  }
  success(res, "Seller fetched", { seller: await serializeOne(seller) });
}

export async function getMySeller(req: AuthRequest, res: Response) {
  const seller = await Seller.findOne({ user: req.userId, isActive: true });
  if (!seller) {
    throw new AppError("Seller profile not found", 404, "NOT_FOUND");
  }
  success(res, "Seller profile fetched", { seller: await serializeOne(seller) });
}

export async function updateMySeller(req: AuthRequest, res: Response) {
  const seller = await Seller.findOne({ user: req.userId, isActive: true });
  if (!seller) {
    throw new AppError("Seller profile not found", 404, "NOT_FOUND");
  }
  await applyProfileUpdates(seller, req.body);
  success(res, "Seller profile updated", { seller: await serializeOne(seller) });
}

/** Admin: edit any seller, including the verified badge. */
export async function adminUpdateSeller(req: Request, res: Response) {
  const seller = await Seller.findOne({ _id: req.params.id, isActive: true });
  if (!seller) {
    throw new AppError("Seller not found", 404, "NOT_FOUND");
  }
  if (req.body.verified !== undefined) {
    seller.verified = req.body.verified;
  }
  await applyProfileUpdates(seller, req.body);
  success(res, "Seller updated", { seller: await serializeOne(seller) });
}

/** Admin: removes a seller from the platform. Their account, shop and listings
 * are deactivated (not erased) so existing orders keep their history. */
export async function adminDeleteSeller(req: Request, res: Response) {
  const seller = await Seller.findOne({ _id: req.params.id, isActive: true });
  if (!seller) {
    throw new AppError("Seller not found", 404, "NOT_FOUND");
  }
  seller.isActive = false;
  await seller.save();
  await Promise.all([
    User.updateOne({ _id: seller.user }, { isActive: false }),
    Product.updateMany({ seller: seller._id }, { isActive: false }),
  ]);
  success(res, "Seller removed");
}
