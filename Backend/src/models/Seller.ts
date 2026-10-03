import { Schema, model, type Document, type Types } from "mongoose";

/** Onboarding state. Only "approved" sellers' products are shown and sold. */
export type SellerStatus = "pending" | "approved" | "rejected" | "suspended";

/** Identity details collected during onboarding. Never exposed publicly. */
export interface SellerKyc {
  legalName: string;
  pan: string;
  gstin?: string;
  submittedAt: Date;
}

/** Where the platform sends this seller's earnings. Never exposed publicly. */
export interface PayoutDetails {
  method: "upi" | "bank";
  upiId?: string;
  accountHolder?: string;
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
}

/** A seller's shop/farm profile. Login details (name, email, phone, password)
 * live on the linked User; this holds the public storefront information. */
export interface SellerDocument extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  farmName: string;
  location: string;
  district: string;
  state: string;
  about: string;
  image: string;
  /** "Verified Farmer" trust badge, awarded by admins independently of approval. */
  verified: boolean;
  status: SellerStatus;
  /** Admin's reason when rejecting or suspending. */
  statusReason?: string;
  kyc?: SellerKyc;
  payout?: PayoutDetails;
  farmingType?: string;
  experienceYears?: number;
  mainProducts: string[];
  photos: string[];
  rating: number;
  reviewCount: number;
  joinedYear: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sellerSchema = new Schema<SellerDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    farmName: { type: String, required: true, trim: true },
    location: { type: String, default: "", trim: true },
    district: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    about: { type: String, default: "", trim: true },
    image: { type: String, default: "" },
    verified: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "approved", "rejected", "suspended"], default: "pending", index: true },
    statusReason: { type: String, trim: true },
    kyc: {
      type: new Schema<SellerKyc>(
        {
          legalName: { type: String, required: true, trim: true },
          pan: { type: String, required: true, uppercase: true, trim: true },
          gstin: { type: String, uppercase: true, trim: true },
          submittedAt: { type: Date, default: Date.now },
        },
        { _id: false }
      ),
      default: undefined,
    },
    payout: {
      type: new Schema<PayoutDetails>(
        {
          method: { type: String, enum: ["upi", "bank"], required: true },
          upiId: { type: String, trim: true },
          accountHolder: { type: String, trim: true },
          accountNumber: { type: String, trim: true },
          ifsc: { type: String, uppercase: true, trim: true },
          bankName: { type: String, trim: true },
        },
        { _id: false }
      ),
      default: undefined,
    },
    farmingType: { type: String, trim: true },
    experienceYears: { type: Number, min: 0 },
    mainProducts: { type: [String], default: [] },
    photos: { type: [String], default: [] },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    joinedYear: { type: Number, default: () => new Date().getFullYear() },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Seller = model<SellerDocument>("Seller", sellerSchema);
