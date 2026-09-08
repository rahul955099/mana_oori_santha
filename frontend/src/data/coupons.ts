import type { Coupon } from "@/types";

// Configurable demo coupon data — no real payment/coupon backend exists yet,
// so these are clearly structured, editable records (also manageable from
// Admin → Coupons/Offers) rather than randomly generated fake discounts.
export const coupons: Coupon[] = [
  {
    id: "coupon-1",
    code: "FIRSTORDER",
    type: "flat",
    value: 50,
    description: "Flat ₹50 off on your order",
    active: true,
  },
  {
    id: "coupon-2",
    code: "FARM10",
    type: "percent",
    value: 10,
    description: "10% off on orders above ₹300",
    active: true,
    minOrderValue: 300,
  },
  {
    id: "coupon-3",
    code: "MILLET10",
    type: "percent",
    value: 10,
    description: "10% off on Millets",
    active: true,
    categoryOnly: "millets",
  },
];
