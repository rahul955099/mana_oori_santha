import { Schema, model, type Document, type Types } from "mongoose";
import { VEHICLES, type Vehicle } from "./DeliveryPartner";

/** An invitation to become an admin or a delivery partner. */
export interface AdminInviteDocument extends Document {
  _id: Types.ObjectId;
  email: string;
  /** What accepting makes them. Older invites have no role: they were admin invites. */
  role?: "admin" | "delivery";
  /** For delivery invites: set up by the admin when inviting. */
  delivery?: { vehicle: Vehicle; serviceAreas: string[] };
  /** SHA-256 of the emailed token; the raw token only exists in the email. */
  tokenHash: string;
  expiresAt: Date;
  invitedBy: Types.ObjectId;
  acceptedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
}

const adminInviteSchema = new Schema<AdminInviteDocument>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ["admin", "delivery"], default: "admin" },
    delivery: {
      type: new Schema({ vehicle: { type: String, enum: VEHICLES }, serviceAreas: { type: [String], default: [] } }, { _id: false }),
      default: undefined,
    },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    acceptedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AdminInvite = model<AdminInviteDocument>("AdminInvite", adminInviteSchema);
