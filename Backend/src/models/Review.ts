import { Schema, model, type Document, type Types } from "mongoose";

export type ReviewStatus = "published" | "hidden";

export interface ReviewDocument extends Document {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  /** Denormalised so seller ratings can be recalculated without a join. */
  seller: Types.ObjectId;
  user: Types.ObjectId;
  /** Shown publicly; captured when the review is written. */
  userName: string;
  rating: number;
  comment: string;
  /** Reviews require a delivered order, so this is always true today; kept
   * explicit so imported or legacy reviews can be told apart. */
  verifiedPurchase: boolean;
  status: ReviewStatus;
  /** Admin's private reason for hiding a review. */
  moderationNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDocument>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    seller: { type: Schema.Types.ObjectId, ref: "Seller", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "", trim: true },
    verifiedPurchase: { type: Boolean, default: true },
    status: { type: String, enum: ["published", "hidden"], default: "published", index: true },
    moderationNote: { type: String, trim: true },
  },
  { timestamps: true }
);

// One review per customer per product (they edit it rather than adding more).
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

export const Review = model<ReviewDocument>("Review", reviewSchema);
