import type { SeedCoupon as Coupon } from "../types";

// Starter offers. Admins manage coupons from Admin → Coupons/Offers after seeding.
export const coupons: Coupon[] = [
  {
    code: "FIRSTORDER",
    type: "flat",
    value: 50,
    description: "Flat ₹50 off on your first order",
    usageLimitPerUser: 1,
  },
  {
    code: "FARM10",
    type: "percent",
    value: 10,
    description: "10% off on orders above ₹300",
    minOrderValue: 300,
  },
  {
    code: "MILLET10",
    type: "percent",
    value: 10,
    description: "10% off on Millets",
    categoryOnly: "millets",
  },
];
