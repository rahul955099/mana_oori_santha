import { Schema, model, type Document, type Types } from "mongoose";
import { hashPassword } from "../utils/password";

export type UserRole = "customer" | "seller" | "admin";

export interface UserAddress {
  addressLine?: string;
  village?: string;
  district?: string;
  state?: string;
  pincode?: string;
}

export interface UserDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  address?: UserAddress;
  profileImage?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<UserAddress>(
  {
    addressLine: { type: String, trim: true },
    village: { type: String, trim: true },
    district: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
  },
  { _id: false }
);

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["customer", "seller", "admin"], default: "customer" },
    address: { type: addressSchema, default: undefined },
    profileImage: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await hashPassword(this.password);
});

export const User = model<UserDocument>("User", userSchema);
