import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Coupon } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export type CouponInput = Omit<Coupon, "id">;

interface CouponsContextValue {
  /** All coupons for admins; active offers for everyone else. */
  coupons: Coupon[];
  activeCoupons: Coupon[];
  reload: () => Promise<void>;
  addCoupon: (coupon: CouponInput) => Promise<void>;
  updateCoupon: (id: string, updates: Partial<CouponInput>) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
}

const CouponsContext = createContext<CouponsContextValue | undefined>(undefined);

/** Coupon definitions. Whether a code applies to a cart is decided by the
 * server's quote (see CartContext), never in the browser. */
export function CouponsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const reload = useCallback(async () => {
    try {
      const data = await api.get<{ coupons: Coupon[] }>("/coupons", isAdmin ? { all: true } : undefined);
      setCoupons(data.coupons);
    } catch {
      setCoupons([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    try {
      localStorage.removeItem("mos_coupons");
    } catch {
      // ignore
    }
    void reload();
  }, [reload]);

  async function addCoupon(coupon: CouponInput) {
    const { coupon: created } = await api.post<{ coupon: Coupon }>("/coupons", coupon);
    setCoupons((prev) => [...prev, created]);
  }

  async function updateCoupon(id: string, updates: Partial<CouponInput>) {
    const { coupon: updated } = await api.patch<{ coupon: Coupon }>(`/coupons/${id}`, updates);
    setCoupons((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  async function deleteCoupon(id: string) {
    await api.delete(`/coupons/${id}`);
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  }

  const activeCoupons = coupons.filter((c) => c.active && (!c.expiresAt || new Date(c.expiresAt) > new Date()));

  return (
    <CouponsContext.Provider value={{ coupons, activeCoupons, reload, addCoupon, updateCoupon, deleteCoupon }}>
      {children}
    </CouponsContext.Provider>
  );
}

export function useCoupons(): CouponsContextValue {
  const ctx = useContext(CouponsContext);
  if (!ctx) throw new Error("useCoupons must be used within CouponsProvider");
  return ctx;
}
