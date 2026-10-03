import { Schema, model, type Document, type Types } from "mongoose";

export type CouponType = "percent" | "flat";

export interface CouponDocument extends Document {
  _id: Types.ObjectId;
  /** Always stored upper-case; customers can type it in any case. */
  code: string;
  type: CouponType;
  /** Percentage (1-100) for "percent", rupees for "flat". */
  value: number;
  description: string;
  active: boolean;
  minOrderValue?: number;
  /** Cap on the discount a percent coupon can give, in rupees. */
  maxDiscount?: number;
  /** Discount applies only to items from this category slug. */
  categoryOnly?: string;
  /** How many orders one customer can use this coupon on (e.g. 1 for FIRSTORDER). */
  usageLimitPerUser?: number;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<CouponDocument>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["percent", "flat"], required: true },
    value: { type: Number, required: true, min: 0 },
    description: { type: String, default: "", trim: true },
    active: { type: Boolean, default: true },
    minOrderValue: { type: Number, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    categoryOnly: { type: String, lowercase: true, trim: true },
    usageLimitPerUser: { type: Number, min: 1 },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

export const Coupon = model<CouponDocument>("Coupon", couponSchema);
