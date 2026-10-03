import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { SupportCategory, SupportRequest, SupportRequestStatus } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export interface SupportPrefill {
  orderId?: string;
  orderSummary?: string;
  category?: SupportCategory;
}

interface SupportContextValue {
  /** The customer's own tickets, or every ticket for admins. */
  requests: SupportRequest[];
  loading: boolean;
  reload: () => Promise<void>;
  submitRequest: (input: { category: SupportCategory; message: string; orderId?: string }) => Promise<SupportRequest>;
  reply: (id: string, message: string) => Promise<SupportRequest>;
  /** Admin only. */
  updateRequestStatus: (id: string, status: SupportRequestStatus) => Promise<SupportRequest>;
  isModalOpen: boolean;
  prefill: SupportPrefill | null;
  openSupport: (prefill?: SupportPrefill) => void;
  closeSupport: () => void;
}

const SupportContext = createContext<SupportContextValue | undefined>(undefined);

type TicketResponse = { ticket: SupportRequest };

export function SupportProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const userId = user?.id ?? null;
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefill, setPrefill] = useState<SupportPrefill | null>(null);

  const reload = useCallback(async () => {
    if (!userId) {
      setRequests([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<{ tickets: SupportRequest[] }>(isAdmin ? "/support" : "/support/mine");
      setRequests(data.tickets);
    } catch {
      // Keep what we have; the pages show their own errors on actions.
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin]);

  useEffect(() => {
    // Old demo builds kept support requests in the browser.
    try {
      localStorage.removeItem("mos_support_requests");
    } catch {
      // ignore
    }
    void reload();
  }, [reload]);

  function upsert(ticket: SupportRequest) {
    setRequests((prev) => [ticket, ...prev.filter((t) => t.id !== ticket.id)]);
    return ticket;
  }

  async function submitRequest(input: { category: SupportCategory; message: string; orderId?: string }) {
    return upsert((await api.post<TicketResponse>("/support", input)).ticket);
  }

  async function reply(id: string, message: string) {
    return upsert((await api.post<TicketResponse>(`/support/${id}/replies`, { message })).ticket);
  }

  async function updateRequestStatus(id: string, status: SupportRequestStatus) {
    const { ticket } = await api.patch<TicketResponse>(`/support/${id}/status`, { status });
    setRequests((prev) => prev.map((t) => (t.id === id ? ticket : t)));
    return ticket;
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
      value={{
        requests,
        loading,
        reload,
        submitRequest,
        reply,
        updateRequestStatus,
        isModalOpen,
        prefill,
        openSupport,
        closeSupport,
      }}
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
