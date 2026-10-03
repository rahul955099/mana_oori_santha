import { Schema, model, type Document, type Types } from "mongoose";

export interface CategoryDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  image: string;
  /** Lower numbers are shown first. */
  sortOrder: number;
  /** Inactive categories are hidden from the storefront (e.g. "coming soon"). */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<CategoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "", trim: true },
    image: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Category = model<CategoryDocument>("Category", categorySchema);
