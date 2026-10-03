import { Schema, model, type Document, type Types } from "mongoose";

export const NOTIFICATION_TYPES = ["order-placed", "order-status", "support-update", "offer", "account"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** In-app notification. Either addressed to one user, or a broadcast to every
 * customer (user empty, audience "customers") whose read state is tracked per reader. */
export interface NotificationDocument extends Document {
  _id: Types.ObjectId;
  user?: Types.ObjectId;
  audience?: "customers";
  type: NotificationType;
  title: string;
  message: string;
  /** Where clicking the notification goes, e.g. "/my-orders". */
  link?: string;
  readAt?: Date;
  readBy: Types.ObjectId[];
  createdAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    audience: { type: String, enum: ["customers"] },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, trim: true },
    readAt: { type: Date },
    readBy: { type: [Schema.Types.ObjectId], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ audience: 1, createdAt: -1 });

export const Notification = model<NotificationDocument>("Notification", notificationSchema);
