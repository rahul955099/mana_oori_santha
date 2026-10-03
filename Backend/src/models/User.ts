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

/** A saved delivery address in the customer's address book. */
export interface SavedAddress {
  _id: Types.ObjectId;
  type: "home" | "work" | "other";
  fullName: string;
  phone: string;
  houseNo: string;
  street: string;
  city: string;
  district?: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault: boolean;
}

/** What the user wants to hear about by email. In-app notifications are always shown. */
export interface NotificationPrefs {
  /** Placed, confirmed, cancelled, returns. */
  orderUpdates: boolean;
  /** Out for delivery and delivered. */
  deliveryAlerts: boolean;
  /** Offers and announcements. Off unless the user opts in. */
  promotions: boolean;
}

export interface UserDocument extends Document {
  _id: Types.ObjectId;
  /** Human-facing account ID shown in the UI, e.g. "MOS-10245". */
  userCode: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  address?: UserAddress;
  addresses: Types.DocumentArray<SavedAddress>;
  wishlist: Types.ObjectId[];
  profileImage?: string;
  emailVerified: boolean;
  notificationPrefs: NotificationPrefs;
  /** SHA-256 hashes of one-time tokens; the raw tokens only ever exist in emails. */
  emailVerifyTokenHash?: string;
  emailVerifyExpires?: Date;
  passwordResetTokenHash?: string;
  passwordResetExpires?: Date;
  /** Tokens issued before this moment are rejected (set when the password changes). */
  passwordChangedAt?: Date;
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

const savedAddressSchema = new Schema<SavedAddress>({
  type: { type: String, enum: ["home", "work", "other"], default: "home" },
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  houseNo: { type: String, required: true, trim: true },
  street: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  district: { type: String, trim: true },
  state: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
  landmark: { type: String, trim: true },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new Schema<UserDocument>(
  {
    userCode: { type: String, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["customer", "seller", "admin"], default: "customer" },
    address: { type: addressSchema, default: undefined },
    addresses: { type: [savedAddressSchema], default: [] },
    wishlist: { type: [{ type: Schema.Types.ObjectId, ref: "Product" }], default: [] },
    profileImage: { type: String },
    emailVerified: { type: Boolean, default: false },
    notificationPrefs: {
      type: new Schema<NotificationPrefs>(
        {
          orderUpdates: { type: Boolean, default: true },
          deliveryAlerts: { type: Boolean, default: true },
          promotions: { type: Boolean, default: false },
        },
        { _id: false }
      ),
      default: () => ({}),
    },
    emailVerifyTokenHash: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordChangedAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

function randomUserCode(): string {
  return `MOS-${Math.floor(10000 + Math.random() * 90000)}`;
}

userSchema.pre("validate", async function () {
  if (this.userCode) return;
  // Five digits gives 90k codes; retry on the rare collision.
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomUserCode();
    if (!(await User.exists({ userCode: code }))) {
      this.userCode = code;
      return;
    }
  }
  throw new Error("Could not generate a unique user code");
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await hashPassword(this.password);
  // Sign out every existing session when an existing password changes.
  // (1s back-dated so the token issued right after a reset stays valid.)
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
});

export const User = model<UserDocument>("User", userSchema);
