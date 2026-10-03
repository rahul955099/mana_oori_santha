import type { Request, Response } from "express";
import { Coupon } from "../models/Coupon";
import { AppError } from "../utils/AppError";
import { success } from "../utils/response";
import { toCoupon } from "../utils/serialize";
import type { AuthRequest } from "../middleware/auth.middleware";

const FIELDS = [
  "code",
  "type",
  "value",
  "description",
  "active",
  "minOrderValue",
  "maxDiscount",
  "categoryOnly",
  "usageLimitPerUser",
  "expiresAt",
] as const;

/** Public: active, unexpired offers. Admins get every coupon with `?all=true`. */
export async function listCoupons(req: AuthRequest, res: Response) {
  const all = req.query.all === "true" && req.userRole === "admin";
  const filter = all
    ? {}
    : { active: true, $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: new Date() } }] };
  const coupons = await Coupon.find(filter).sort({ createdAt: 1 });
  success(res, "Coupons fetched", { coupons: coupons.map(toCoupon) });
}

function assertSaneValue(type: string, value: number) {
  if (type === "percent" && (value <= 0 || value > 100)) {
    throw new AppError("A percentage coupon must be between 1 and 100.", 400, "VALIDATION_ERROR");
  }
}

export async function createCoupon(req: Request, res: Response) {
  assertSaneValue(req.body.type, req.body.value);
  if (await Coupon.exists({ code: String(req.body.code).toUpperCase() })) {
    throw new AppError("A coupon with this code already exists", 409, "DUPLICATE_CODE");
  }
  const values: Record<string, unknown> = {};
  for (const f of FIELDS) if (req.body[f] !== undefined) values[f] = req.body[f];
  const coupon = await Coupon.create(values);
  success(res, "Coupon created", { coupon: toCoupon(coupon) }, 201);
}

export async function updateCoupon(req: Request, res: Response) {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    throw new AppError("Coupon not found", 404, "NOT_FOUND");
  }
  if (req.body.code && String(req.body.code).toUpperCase() !== coupon.code) {
    if (await Coupon.exists({ code: String(req.body.code).toUpperCase() })) {
      throw new AppError("A coupon with this code already exists", 409, "DUPLICATE_CODE");
    }
  }
  for (const f of FIELDS) {
    // null clears an optional limit (e.g. removing a minimum order value).
    if (req.body[f] !== undefined) coupon.set(f, req.body[f] === null ? undefined : req.body[f]);
  }
  assertSaneValue(coupon.type, coupon.value);
  await coupon.save();
  success(res, "Coupon updated", { coupon: toCoupon(coupon) });
}

export async function deleteCoupon(req: Request, res: Response) {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) {
    throw new AppError("Coupon not found", 404, "NOT_FOUND");
  }
  success(res, "Coupon deleted");
}
