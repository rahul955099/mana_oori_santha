import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Address } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export type AddressInput = Omit<Address, "id" | "isDefault">;

interface AddressContextValue {
  /** The logged-in customer's address book (empty for guests). */
  addresses: Address[];
  loading: boolean;
  addAddress: (address: AddressInput) => Promise<void>;
  updateAddress: (id: string, updates: Partial<AddressInput>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
  defaultAddress: Address | undefined;
}

const AddressContext = createContext<AddressContextValue | undefined>(undefined);

type AddressesResponse = { addresses: Address[] };

export function AddressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Old demo builds kept addresses in the browser; the account is the source now.
    try {
      localStorage.removeItem("mos_addresses");
    } catch {
      // ignore
    }
    if (!userId) {
      setAddresses([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get<AddressesResponse>("/addresses")
      .then((data) => !cancelled && setAddresses(data.addresses))
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Every mutation returns the full, updated address book.
  async function addAddress(address: AddressInput) {
    setAddresses((await api.post<AddressesResponse>("/addresses", address)).addresses);
  }

  async function updateAddress(id: string, updates: Partial<AddressInput>) {
    setAddresses((await api.patch<AddressesResponse>(`/addresses/${id}`, updates)).addresses);
  }

  async function deleteAddress(id: string) {
    setAddresses((await api.delete<AddressesResponse>(`/addresses/${id}`)).addresses);
  }

  async function setDefaultAddress(id: string) {
    setAddresses((await api.post<AddressesResponse>(`/addresses/${id}/default`)).addresses);
  }

  const defaultAddress = addresses.find((a) => a.isDefault);

  return (
    <AddressContext.Provider
      value={{ addresses, loading, addAddress, updateAddress, deleteAddress, setDefaultAddress, defaultAddress }}
    >
      {children}
    </AddressContext.Provider>
  );
}

export function useAddresses(): AddressContextValue {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error("useAddresses must be used within AddressProvider");
  return ctx;
}
