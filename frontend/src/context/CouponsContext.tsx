import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Coupon, Product } from "@/types";
import { coupons as initialCoupons } from "@/data/coupons";

export interface CouponValidationResult {
  valid: boolean;
  message: string;
  discount: number;
  coupon?: Coupon;
}

interface CouponsContextValue {
  coupons: Coupon[];
  activeCoupons: Coupon[];
  addCoupon: (coupon: Omit<Coupon, "id">) => void;
  updateCoupon: (id: string, updates: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;
  /** Validates a code against the current cart and returns the computed discount. Never invents fake codes. */
  validateCoupon: (
    code: string,
    cartItems: { productId: string; quantity: number }[],
    products: Product[],
    subtotal: number,
  ) => CouponValidationResult;
}

const CouponsContext = createContext<CouponsContextValue | undefined>(undefined);
const STORAGE_KEY = "mos_coupons";

export function CouponsProvider({ children }: { children: ReactNode }) {
  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Coupon[]) : initialCoupons;
    } catch {
      return initialCoupons;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
  }, [coupons]);

  function addCoupon(coupon: Omit<Coupon, "id">) {
    setCoupons((prev) => [...prev, { ...coupon, id: `coupon-${Date.now()}` }]);
  }

  function updateCoupon(id: string, updates: Partial<Coupon>) {
    setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }

  function deleteCoupon(id: string) {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  }

  function validateCoupon(
    code: string,
    cartItems: { productId: string; quantity: number }[],
    products: Product[],
    subtotal: number,
  ): CouponValidationResult {
    const coupon = coupons.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
    if (!coupon || !coupon.active) {
      return { valid: false, message: "Invalid or expired coupon code.", discount: 0 };
    }
    if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
      return {
        valid: false,
        message: `This coupon needs a minimum order of ₹${coupon.minOrderValue}.`,
        discount: 0,
      };
    }

    let eligibleAmount = subtotal;
    if (coupon.categoryOnly) {
      eligibleAmount = cartItems.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.productId);
        if (product && product.category === coupon.categoryOnly) {
          return sum + product.price * item.quantity;
        }
        return sum;
      }, 0);
      if (eligibleAmount === 0) {
        return {
          valid: false,
          message: `This coupon only applies to ${coupon.categoryOnly} products in your cart.`,
          discount: 0,
        };
      }
    }

    const discount =
      coupon.type === "flat" ? Math.min(coupon.value, eligibleAmount) : Math.round((eligibleAmount * coupon.value) / 100);

    return { valid: true, message: `Coupon "${coupon.code}" applied!`, discount, coupon };
  }

  const activeCoupons = coupons.filter((c) => c.active);

  return (
    <CouponsContext.Provider
      value={{ coupons, activeCoupons, addCoupon, updateCoupon, deleteCoupon, validateCoupon }}
    >
      {children}
    </CouponsContext.Provider>
  );
}

export function useCoupons(): CouponsContextValue {
  const ctx = useContext(CouponsContext);
  if (!ctx) throw new Error("useCoupons must be used within CouponsProvider");
  return ctx;
}
