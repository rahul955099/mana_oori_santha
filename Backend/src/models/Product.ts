import { Schema, model, type Document, type Types } from "mongoose";

/** New products wait for the site owner's review before customers can see them. */
export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export interface ProductDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  /** Telugu display name, shown alongside `name`. Empty until someone enters it. */
  nameTe: string;
  slug: string;
  /** Category slug — categories are few and slugs are stable, so products
   * reference them by slug to keep storefront filtering simple. */
  category: string;
  price: number;
  mrp: number;
  unit: string;
  image: string;
  images: string[];
  seller: Types.ObjectId;
  rating: number;
  reviewCount: number;
  stock: number;
  description: string;
  benefits: string[];
  /** Sizes this item comes in, e.g. ["S", "M", "L"]. Empty for products without sizes.
   * All sizes share the one stock count. */
  sizes: string[];
  isOrganic: boolean;
  isFeatured: boolean;
  priceAvailable: boolean;
  priceLabel?: string;
  /** Soft-delete flag: deleted products stay in the database so past orders
   * can still show what was bought. */
  isActive: boolean;
  /** Only approved products are shown or sold to customers. */
  approvalStatus: ApprovalStatus;
  /** Why the owner rejected it; cleared when it is resubmitted. */
  rejectionReason?: string;
  /** The user (seller or admin) who added the product. */
  submittedBy?: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<ProductDocument>(
  {
    name: { type: String, required: true, trim: true },
    nameTe: { type: String, default: "", trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, required: true, lowercase: true, trim: true, index: true },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    images: { type: [String], default: [] },
    seller: { type: Schema.Types.ObjectId, ref: "Seller", required: true, index: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    description: { type: String, default: "", trim: true },
    benefits: { type: [String], default: [] },
    sizes: { type: [String], default: [] },
    isOrganic: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    priceAvailable: { type: Boolean, default: true },
    priceLabel: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    approvalStatus: { type: String, enum: APPROVAL_STATUSES, default: "pending", index: true },
    rejectionReason: { type: String, trim: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

export const Product = model<ProductDocument>("Product", productSchema);
