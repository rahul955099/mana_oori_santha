import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Seller } from "@/types";
import { sellers as initialSellers } from "@/data/sellers";

interface SellersContextValue {
  sellers: Seller[];
  updateSeller: (id: string, updates: Partial<Seller>) => void;
  deleteSeller: (id: string) => void;
  getSellerById: (id: string) => Seller | undefined;
}

const SellersContext = createContext<SellersContextValue | undefined>(undefined);
const STORAGE_KEY = "mos_sellers";

export function SellersProvider({ children }: { children: ReactNode }) {
  const [sellers, setSellers] = useState<Seller[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Seller[]) : initialSellers;
    } catch {
      return initialSellers;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sellers));
  }, [sellers]);

  function updateSeller(id: string, updates: Partial<Seller>) {
    setSellers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }

  function deleteSeller(id: string) {
    setSellers((prev) => prev.filter((s) => s.id !== id));
  }

  function getSellerById(id: string) {
    return sellers.find((s) => s.id === id);
  }

  return (
    <SellersContext.Provider value={{ sellers, updateSeller, deleteSeller, getSellerById }}>
      {children}
    </SellersContext.Provider>
  );
}

export function useSellers(): SellersContextValue {
  const ctx = useContext(SellersContext);
  if (!ctx) throw new Error("useSellers must be used within SellersProvider");
  return ctx;
}
