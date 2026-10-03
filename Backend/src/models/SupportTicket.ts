import { Schema, model, type Document, type Types } from "mongoose";
import type { UserRole } from "./User";

export const SUPPORT_CATEGORIES = [
  "order-issue",
  "delivery-issue",
  "payment-issue",
  "product-issue",
  "return-refund",
  "farmer-query",
  "account-issue",
] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_STATUSES = ["open", "in-progress", "resolved"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export interface SupportReply {
  byRole: UserRole;
  authorName: string;
  message: string;
  at: Date;
}

export interface SupportTicketDocument extends Document {
  _id: Types.ObjectId;
  /** Human-readable, e.g. "SUP-10001". */
  ticketNumber: string;
  user: Types.ObjectId;
  category: SupportCategory;
  message: string;
  /** Order number the ticket is about, e.g. "MOS-100001". */
  orderNumber?: string;
  status: SupportStatus;
  replies: SupportReply[];
  createdAt: Date;
  updatedAt: Date;
}

const supportTicketSchema = new Schema<SupportTicketDocument>(
  {
    ticketNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: String, enum: SUPPORT_CATEGORIES, required: true },
    message: { type: String, required: true, trim: true },
    orderNumber: { type: String, trim: true },
    status: { type: String, enum: SUPPORT_STATUSES, default: "open", index: true },
    replies: {
      type: [
        new Schema<SupportReply>(
          {
            byRole: { type: String, required: true },
            authorName: { type: String, required: true },
            message: { type: String, required: true, trim: true },
            at: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export const SupportTicket = model<SupportTicketDocument>("SupportTicket", supportTicketSchema);
