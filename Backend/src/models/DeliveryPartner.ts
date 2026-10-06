import { Schema, model, type Document, type Types } from "mongoose";

export const VEHICLES = ["bike", "auto", "van"] as const;
export type Vehicle = (typeof VEHICLES)[number];

/** The delivery side of a "delivery" user account. */
export interface DeliveryPartnerDocument extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  vehicle: Vehicle;
  /** Pincodes this partner delivers to. */
  serviceAreas: string[];
  /** The India date (YYYY-MM-DD) the partner last switched on "Available today".
   * Availability lapses at midnight, so a forgotten switch never gets them work. */
  availableOn?: string;
  /** False when an admin blocks the partner. */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryPartnerSchema = new Schema<DeliveryPartnerDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    vehicle: { type: String, enum: VEHICLES, default: "bike" },
    serviceAreas: { type: [String], default: [] },
    availableOn: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const DeliveryPartner = model<DeliveryPartnerDocument>("DeliveryPartner", deliveryPartnerSchema);
