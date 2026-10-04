import { Schema, model, type Document, type Types } from "mongoose";

/** An invitation for someone without an account to become an admin. */
export interface AdminInviteDocument extends Document {
  _id: Types.ObjectId;
  email: string;
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
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    acceptedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AdminInvite = model<AdminInviteDocument>("AdminInvite", adminInviteSchema);
