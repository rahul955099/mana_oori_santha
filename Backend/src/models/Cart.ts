import { Schema, model, type Document, type Types } from "mongoose";

export interface CartLine {
  product: Types.ObjectId;
  quantity: number;
}

export interface CartDocument extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  items: CartLine[];
  couponCode?: string;
  updatedAt: Date;
}

const cartSchema = new Schema<CartDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: {
      type: [
        new Schema<CartLine>(
          {
            product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
            quantity: { type: Number, required: true, min: 1 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    couponCode: { type: String, uppercase: true, trim: true },
  },
  { timestamps: true }
);

export const Cart = model<CartDocument>("Cart", cartSchema);
