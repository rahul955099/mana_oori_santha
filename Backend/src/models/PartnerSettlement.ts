import { Schema, model, type Document, type Types } from "mongoose";

/** Money moving between the business and a delivery partner, recorded by the owner.
 * "cash-received": the partner handed over cash they collected from customers.
 * "fee-paid": the business paid the partner their delivery fees. */
export interface PartnerSettlementDocument extends Document {
  _id: Types.ObjectId;
  partner: Types.ObjectId;
  kind: "cash-received" | "fee-paid";
  amount: number;
  method: "cash" | "upi" | "bank";
  reference?: string;
  note?: string;
  at: Date;
  recordedBy: Types.ObjectId;
  createdAt: Date;
}

const partnerSettlementSchema = new Schema<PartnerSettlementDocument>(
  {
    partner: { type: Schema.Types.ObjectId, ref: "DeliveryPartner", required: true, index: true },
    kind: { type: String, enum: ["cash-received", "fee-paid"], required: true },
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ["cash", "upi", "bank"], required: true },
    reference: { type: String, trim: true },
    note: { type: String, trim: true },
    at: { type: Date, default: Date.now },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const PartnerSettlement = model<PartnerSettlementDocument>("PartnerSettlement", partnerSettlementSchema);
