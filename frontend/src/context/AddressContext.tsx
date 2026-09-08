import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Address } from "@/types";

interface AddressContextValue {
  addresses: Address[];
  addAddress: (address: Omit<Address, "id" | "isDefault">) => void;
  updateAddress: (id: string, updates: Partial<Omit<Address, "id">>) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  defaultAddress: Address | undefined;
}

const AddressContext = createContext<AddressContextValue | undefined>(undefined);
const STORAGE_KEY = "mos_addresses";

export function AddressProvider({ children }: { children: ReactNode }) {
  const [addresses, setAddresses] = useState<Address[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Address[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
  }, [addresses]);

  function addAddress(address: Omit<Address, "id" | "isDefault">) {
    setAddresses((prev) => {
      const newAddress: Address = {
        ...address,
        id: `addr-${Date.now()}`,
        // The very first saved address automatically becomes the default.
        isDefault: prev.length === 0,
      };
      return [...prev, newAddress];
    });
  }

  function updateAddress(id: string, updates: Partial<Omit<Address, "id">>) {
    setAddresses((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }

  function deleteAddress(id: string) {
    setAddresses((prev) => {
      const next = prev.filter((a) => a.id !== id);
      const removedWasDefault = prev.find((a) => a.id === id)?.isDefault;
      if (removedWasDefault && next.length > 0) {
        next[0] = { ...next[0], isDefault: true };
      }
      return next;
    });
  }

  function setDefaultAddress(id: string) {
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
  }

  const defaultAddress = addresses.find((a) => a.isDefault);

  return (
    <AddressContext.Provider
      value={{ addresses, addAddress, updateAddress, deleteAddress, setDefaultAddress, defaultAddress }}
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
