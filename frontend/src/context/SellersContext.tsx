import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Seller } from "@/types";
import { api, errorMessage } from "@/lib/api";

/** Seller fields that can be edited. `verified` is honoured for admins only. */
export type SellerUpdate = Partial<
  Pick<
    Seller,
    | "name"
    | "email"
    | "phone"
    | "farmName"
    | "location"
    | "district"
    | "state"
    | "about"
    | "image"
    | "farmingType"
    | "experienceYears"
    | "mainProducts"
    | "photos"
    | "verified"
  >
>;

interface SellersContextValue {
  sellers: Seller[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Admin: edit any seller (including the verified badge). */
  updateSeller: (id: string, updates: SellerUpdate) => Promise<Seller>;
  /** Seller: edit their own shop profile. */
  updateMySeller: (updates: Omit<SellerUpdate, "verified">) => Promise<Seller>;
  /** Admin: remove a seller and hide their listings. */
  deleteSeller: (id: string) => Promise<void>;
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

  function replace(seller: Seller) {
    setSellers((prev) => prev.map((s) => (s.id === seller.id ? seller : s)));
    return seller;
  }

  async function updateSeller(id: string, updates: SellerUpdate) {
    const { seller } = await api.patch<{ seller: Seller }>(`/sellers/${id}`, updates);
    return replace(seller);
  }

  async function updateMySeller(updates: Omit<SellerUpdate, "verified">) {
    const { seller } = await api.patch<{ seller: Seller }>("/sellers/me", updates);
    return replace(seller);
  }

  async function deleteSeller(id: string) {
    await api.delete(`/sellers/${id}`);
    setSellers((prev) => prev.filter((s) => s.id !== id));
  }

  function getSellerById(id: string) {
    return sellers.find((s) => s.id === id);
  }

  return (
    <SellersContext.Provider
      value={{ sellers, loading, error, reload, updateSeller, updateMySeller, deleteSeller, getSellerById }}
    >
      {children}
    </SellersContext.Provider>
  );
}

export function useSellers(): SellersContextValue {
  const ctx = useContext(SellersContext);
  if (!ctx) throw new Error("useSellers must be used within SellersProvider");
  return ctx;
}
