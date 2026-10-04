import { Schema, model, type Document, type Types } from "mongoose";

export const ADMIN_ACTIONS = [
  "admin.added", // an existing customer was made an admin
  "admin.invited",
  "admin.invite-resent",
  "admin.invite-cancelled",
  "admin.invite-accepted",
  "admin.removed",
] as const;
export type AdminAction = (typeof ADMIN_ACTIONS)[number];

/** Who changed the admin team, and when. Kept even if people leave. */
export interface AdminActivityDocument extends Document {
  _id: Types.ObjectId;
  action: AdminAction;
  /** Name and email are copied in so the history reads correctly later. */
  actorName: string;
  actorEmail: string;
  targetEmail: string;
  createdAt: Date;
}

const adminActivitySchema = new Schema<AdminActivityDocument>(
  {
    action: { type: String, enum: ADMIN_ACTIONS, required: true },
    actorName: { type: String, required: true },
    actorEmail: { type: String, required: true },
    targetEmail: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

adminActivitySchema.index({ createdAt: -1 });

export const AdminActivity = model<AdminActivityDocument>("AdminActivity", adminActivitySchema);
