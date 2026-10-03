import { Schema, model, type Document, type Types } from "mongoose";

/** A payment made to a seller, recorded by an admin after paying them
 * outside the platform (UPI or bank transfer). */
export interface PayoutDocument extends Document {
  _id: Types.ObjectId;
  seller: Types.ObjectId;
  amount: number;
  method: "upi" | "bank" | "cash";
  /** UTR / transaction reference from the bank or UPI app. */
  reference: string;
  note?: string;
  paidAt: Date;
  recordedBy: Types.ObjectId;
  createdAt: Date;
}

const payoutSchema = new Schema<PayoutDocument>(
  {
    seller: { type: Schema.Types.ObjectId, ref: "Seller", required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ["upi", "bank", "cash"], required: true },
    reference: { type: String, required: true, trim: true },
    note: { type: String, trim: true },
    paidAt: { type: Date, default: Date.now },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Payout = model<PayoutDocument>("Payout", payoutSchema);
