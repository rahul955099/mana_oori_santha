import { Schema, model, type Document, type Types } from "mongoose";

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
  verified: boolean;
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
