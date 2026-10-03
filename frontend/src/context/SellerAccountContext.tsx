import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { SellerAccount } from "@/types";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export interface KycInput {
  legalName: string;
  pan: string;
  gstin?: string;
  payout:
    | { method: "upi"; upiId: string }
    | { method: "bank"; accountHolder: string; accountNumber: string; ifsc: string; bankName?: string };
}

export type SellerProfileInput = Partial<
  Pick<SellerAccount, "name" | "email" | "phone" | "farmName" | "location" | "about" | "image" | "photos">
>;

interface SellerAccountContextValue {
  /** The logged-in seller's own shop, including approval status and masked KYC. */
  account: SellerAccount | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  updateProfile: (updates: SellerProfileInput) => Promise<void>;
  submitKyc: (input: KycInput) => Promise<void>;
}

const SellerAccountContext = createContext<SellerAccountContextValue | undefined>(undefined);

/** Provided by the seller panel layout. */
export function SellerAccountProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [account, setAccount] = useState<SellerAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setAccount((await api.get<{ seller: SellerAccount }>("/sellers/me")).seller);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "seller") void reload();
  }, [user?.role, reload]);

  async function updateProfile(updates: SellerProfileInput) {
    setAccount((await api.patch<{ seller: SellerAccount }>("/sellers/me", updates)).seller);
    // Name, email and shop name also live on the logged-in user.
    await refreshUser();
  }

  async function submitKyc(input: KycInput) {
    setAccount((await api.put<{ seller: SellerAccount }>("/sellers/me/kyc", input)).seller);
  }

  return (
    <SellerAccountContext.Provider value={{ account, loading, error, reload, updateProfile, submitKyc }}>
      {children}
    </SellerAccountContext.Provider>
  );
}

export function useSellerAccount(): SellerAccountContextValue {
  const ctx = useContext(SellerAccountContext);
  if (!ctx) throw new Error("useSellerAccount must be used within SellerAccountProvider");
  return ctx;
}
