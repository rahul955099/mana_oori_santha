import { Schema, model, type Document, type Types } from "mongoose";
import type { UserRole } from "./User";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "packed",
  "out-for-delivery",
  "delivered",
  "cancelled",
  "return-requested",
  "returned",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type PaymentStatus = "pending" | "paid" | "refunded";

/** Snapshot of the product at the time of purchase, so later price or name
 * changes never rewrite order history. */
export interface OrderItem {
  product: Types.ObjectId;
  seller: Types.ObjectId;
  name: string;
  image: string;
  unit: string;
  category: string;
  price: number;
  quantity: number;
}

export interface ShippingAddress {
  fullName: string;
  mobile: string;
  email: string;
  address: string;
  village: string;
  district: string;
  state: string;
  pincode: string;
}

export interface StatusChange {
  status: OrderStatus;
  at: Date;
  byRole: UserRole;
  note?: string;
}

export interface OrderDocument extends Document {
  _id: Types.ObjectId;
  /** Human-readable, sequential, e.g. "MOS-100001". */
  orderNumber: string;
  user: Types.ObjectId;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  total: number;
  couponCode?: string;
  /** Platform commission percent at the time of the order. */
  commissionRate: number;
  paymentMethod: "cod";
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  statusHistory: StatusChange[];
  shippingAddress: ShippingAddress;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<OrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    seller: { type: Schema.Types.ObjectId, ref: "Seller", required: true },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    unit: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const shippingSchema = new Schema<ShippingAddress>(
  {
    fullName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    address: { type: String, required: true, trim: true },
    village: { type: String, required: true, trim: true },
    district: { type: String, default: "", trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const orderSchema = new Schema<OrderDocument>(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    couponCode: { type: String, uppercase: true, trim: true },
    commissionRate: { type: Number, default: 5, min: 0, max: 100 },
    paymentMethod: { type: String, enum: ["cod"], default: "cod" },
    paymentStatus: { type: String, enum: ["pending", "paid", "refunded"], default: "pending" },
    status: { type: String, enum: ORDER_STATUSES, default: "pending", index: true },
    statusHistory: {
      type: [
        new Schema<StatusChange>(
          {
            status: { type: String, enum: ORDER_STATUSES, required: true },
            at: { type: Date, default: Date.now },
            byRole: { type: String, required: true },
            note: { type: String, trim: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    shippingAddress: { type: shippingSchema, required: true },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

orderSchema.index({ "items.seller": 1, createdAt: -1 });

export const Order = model<OrderDocument>("Order", orderSchema);
