import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { SupportCategory, SupportRequest, SupportRequestStatus } from "@/types";

export interface SupportPrefill {
  orderId?: string;
  orderSummary?: string;
  category?: SupportCategory;
}

interface SupportContextValue {
  requests: SupportRequest[];
  submitRequest: (input: {
    userId: string;
    userName: string;
    userEmail: string;
    category: SupportCategory;
    message: string;
    orderId?: string;
  }) => SupportRequest;
  updateRequestStatus: (id: string, status: SupportRequestStatus) => void;
  isModalOpen: boolean;
  prefill: SupportPrefill | null;
  openSupport: (prefill?: SupportPrefill) => void;
  closeSupport: () => void;
}

const SupportContext = createContext<SupportContextValue | undefined>(undefined);
const STORAGE_KEY = "mos_support_requests";

export function SupportProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<SupportRequest[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SupportRequest[]) : [];
    } catch {
      return [];
    }
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefill, setPrefill] = useState<SupportPrefill | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  }, [requests]);

  function submitRequest(input: {
    userId: string;
    userName: string;
    userEmail: string;
    category: SupportCategory;
    message: string;
    orderId?: string;
  }): SupportRequest {
    const newRequest: SupportRequest = {
      ...input,
      id: `SUP-${Math.floor(10000 + Math.random() * 89999)}`,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    setRequests((prev) => [newRequest, ...prev]);
    return newRequest;
  }

  function updateRequestStatus(id: string, status: SupportRequestStatus) {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  const openSupport = useCallback((next?: SupportPrefill) => {
    setPrefill(next ?? null);
    setIsModalOpen(true);
  }, []);

  const closeSupport = useCallback(() => {
    setIsModalOpen(false);
    setPrefill(null);
  }, []);

  return (
    <SupportContext.Provider
      value={{ requests, submitRequest, updateRequestStatus, isModalOpen, prefill, openSupport, closeSupport }}
    >
      {children}
    </SupportContext.Provider>
  );
}

export function useSupport(): SupportContextValue {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error("useSupport must be used within SupportProvider");
  return ctx;
}
