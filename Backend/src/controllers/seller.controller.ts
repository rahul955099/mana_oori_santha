import type { Response } from "express";
import { Types } from "mongoose";
import { Seller, type SellerDocument, type SellerStatus } from "../models/Seller";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { AppError } from "../utils/AppError";
import { success } from "../utils/response";
import { toSeller, toSellerPrivate } from "../utils/serialize";
import { sellerEarnings } from "../services/earnings.service";
import type { AuthRequest } from "../middleware/auth.middleware";
import { onKycSubmitted, onSellerStatusChanged } from "../services/events.service";

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

async function countFor(seller: SellerDocument) {
  return (await productCounts([seller._id])).get(seller._id.toString()) ?? 0;
}

async function publicView(seller: SellerDocument) {
  await seller.populate("user", USER_FIELDS);
  return toSeller(seller, await countFor(seller));
}

async function privateView(seller: SellerDocument, full = false) {
  await seller.populate("user", USER_FIELDS);
  return toSellerPrivate(seller, await countFor(seller), { full });
}

async function findMine(req: AuthRequest) {
  const seller = await Seller.findOne({ user: req.userId, isActive: true });
  if (!seller) {
    throw new AppError("Seller profile not found", 404, "NOT_FOUND");
  }
  return seller;
}

async function findById(id: string) {
  const seller = await Seller.findOne({ _id: id, isActive: true });
  if (!seller) {
    throw new AppError("Seller not found", 404, "NOT_FOUND");
  }
  return seller;
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

/** Public: approved sellers. Admins pass `?all=true` to include every
 * onboarding status, with KYC details masked. */
export async function listSellers(req: AuthRequest, res: Response) {
  const all = req.query.all === "true" && req.userRole === "admin";
  const sellers = await Seller.find(all ? { isActive: true } : { isActive: true, status: "approved" })
    .sort({ verified: -1, rating: -1 })
    .populate("user", USER_FIELDS);
  const counts = await productCounts(sellers.map((s) => s._id));
  success(res, "Sellers fetched", {
    sellers: sellers.map((s) => {
      const count = counts.get(s._id.toString()) ?? 0;
      return all ? toSellerPrivate(s, count) : toSeller(s, count);
    }),
  });
}

export async function getSeller(req: AuthRequest, res: Response) {
  const seller = await findById(String(req.params.id));
  const isOwner = req.userId && seller.user.equals(req.userId);
  if (seller.status !== "approved" && req.userRole !== "admin" && !isOwner) {
    throw new AppError("Seller not found", 404, "NOT_FOUND");
  }
  success(res, "Seller fetched", { seller: await publicView(seller) });
}

export async function getMySeller(req: AuthRequest, res: Response) {
  success(res, "Seller profile fetched", { seller: await privateView(await findMine(req)) });
}

export async function updateMySeller(req: AuthRequest, res: Response) {
  const seller = await findMine(req);
  await applyProfileUpdates(seller, req.body);
  success(res, "Seller profile updated", { seller: await privateView(seller) });
}

/** Seller submits (or resubmits) identity and payout details. Full numbers
 * are required each time; responses only ever show them masked. */
export async function submitMyKyc(req: AuthRequest, res: Response) {
  const seller = await findMine(req);
  const { legalName, pan, gstin, payout } = req.body;

  seller.kyc = { legalName, pan, gstin: gstin || undefined, submittedAt: new Date() };
  seller.payout =
    payout.method === "upi"
      ? { method: "upi", upiId: payout.upiId }
      : {
          method: "bank",
          accountHolder: payout.accountHolder,
          accountNumber: payout.accountNumber,
          ifsc: payout.ifsc,
          bankName: payout.bankName,
        };
  // A rejected seller who fixes their details goes back into the review queue.
  onKycSubmitted(seller.farmName);
  if (seller.status === "rejected") {
    seller.status = "pending";
    seller.statusReason = undefined;
  }
  await seller.save();
  success(res, "Details submitted for review", { seller: await privateView(seller) });
}

export async function getMyEarnings(req: AuthRequest, res: Response) {
  const seller = await findMine(req);
  success(res, "Earnings fetched", await sellerEarnings(seller._id));
}

/** Admin: full KYC and payout details for review or for paying the seller. */
export async function adminGetSellerKyc(req: AuthRequest, res: Response) {
  const seller = await findById(String(req.params.id));
  success(res, "Seller details fetched", { seller: await privateView(seller, true) });
}

export async function adminGetSellerEarnings(req: AuthRequest, res: Response) {
  const seller = await findById(String(req.params.id));
  success(res, "Earnings fetched", await sellerEarnings(seller._id));
}

/** Admin: edit any seller, including the verified badge. */
export async function adminUpdateSeller(req: AuthRequest, res: Response) {
  const seller = await findById(String(req.params.id));
  if (req.body.verified !== undefined) {
    seller.verified = req.body.verified;
  }
  await applyProfileUpdates(seller, req.body);
  success(res, "Seller updated", { seller: await privateView(seller) });
}

/** Admin: approve, reject, suspend or reinstate a seller. */
export async function adminSetSellerStatus(req: AuthRequest, res: Response) {
  const seller = await findById(String(req.params.id));
  const status = req.body.status as SellerStatus;
  const reason = (req.body.reason as string | undefined)?.trim();

  if ((status === "rejected" || status === "suspended") && !reason) {
    throw new AppError("Please give a reason so the seller knows what to fix.", 400, "VALIDATION_ERROR");
  }
  if (status === "approved" && !seller.kyc) {
    throw new AppError("This seller hasn't submitted KYC and payout details yet.", 400, "KYC_MISSING");
  }

  const previous = seller.status;
  seller.status = status;
  seller.statusReason = status === "approved" || status === "pending" ? undefined : reason;
  await seller.save();
  if (previous !== status) onSellerStatusChanged(seller.user, seller.farmName, status, reason);
  success(res, `Seller ${status}`, { seller: await privateView(seller) });
}

/** Admin: removes a seller from the platform. Their account, shop and listings
 * are deactivated (not erased) so existing orders keep their history. */
export async function adminDeleteSeller(req: AuthRequest, res: Response) {
  const seller = await findById(String(req.params.id));
  seller.isActive = false;
  await seller.save();
  await Promise.all([
    User.updateOne({ _id: seller.user }, { isActive: false }),
    Product.updateMany({ seller: seller._id }, { isActive: false }),
  ]);
  success(res, "Seller removed");
}
