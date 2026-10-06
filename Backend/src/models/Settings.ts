import { Schema, model, type Document } from "mongoose";

/** Delivery rules the owner can change from the admin panel. */
export interface DeliverySettings {
  /** Paid to a partner for each delivered order. */
  feePerDelivery: number;
  /** Added for each shop beyond the first that the partner picks up from. */
  extraPickupFee: number;
  /** A partner with this many active deliveries isn't offered more. */
  maxActiveDeliveries: number;
  /** A partner holding more unsettled cash than this isn't offered more. */
  cashLimit: number;
  /** Minutes a partner has to accept before the order goes back to "unassigned". */
  acceptWithinMinutes: number;
}

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  feePerDelivery: 30,
  extraPickupFee: 10,
  maxActiveDeliveries: 20,
  cashLimit: 10000,
  acceptWithinMinutes: 30,
};

interface SettingsDocument extends Document {
  key: string;
  delivery: DeliverySettings;
}

const settingsSchema = new Schema<SettingsDocument>(
  {
    key: { type: String, required: true, unique: true },
    delivery: {
      feePerDelivery: { type: Number, min: 0 },
      extraPickupFee: { type: Number, min: 0 },
      maxActiveDeliveries: { type: Number, min: 1 },
      cashLimit: { type: Number, min: 0 },
      acceptWithinMinutes: { type: Number, min: 5 },
    },
  },
  { timestamps: true }
);

export const Settings = model<SettingsDocument>("Settings", settingsSchema);
