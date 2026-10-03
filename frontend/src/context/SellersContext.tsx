import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Seller } from "@/types";
import { api, errorMessage } from "@/lib/api";

interface SellersContextValue {
  /** Approved sellers shown on the storefront. Sellers manage their own shop
   * through SellerAccountContext; admins manage sellers from the admin panel. */
  sellers: Seller[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  getSellerById: (id: string) => Seller | undefined;
}

const SellersContext = createContext<SellersContextValue | undefined>(undefined);

export function SellersProvider({ children }: { children: ReactNode }) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await api.get<{ sellers: Seller[] }>("/sellers");
      setSellers(data.sellers);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem("mos_sellers");
    } catch {
      // ignore
    }
    void reload();
  }, [reload]);

  function getSellerById(id: string) {
    return sellers.find((s) => s.id === id);
  }

  return (
    <SellersContext.Provider value={{ sellers, loading, error, reload, getSellerById }}>{children}</SellersContext.Provider>
  );
}

export function useSellers(): SellersContextValue {
  const ctx = useContext(SellersContext);
  if (!ctx) throw new Error("useSellers must be used within SellersProvider");
  return ctx;
}
