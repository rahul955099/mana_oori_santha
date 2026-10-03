import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

interface WishlistContextValue {
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);
const STORAGE_KEY = "mos_wishlist";

/** Wishlist kept in the browser for guests and saved to the account once logged in. */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const syncedUser = useRef<string | null>(null);
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
    } catch {
      // ignore
    }
  }, [wishlist]);

  // Merge on login, clear on logout (same approach as the cart).
  useEffect(() => {
    if (!userId) {
      if (syncedUser.current) setWishlist([]);
      syncedUser.current = null;
      return;
    }
    let cancelled = false;
    api
      .get<{ productIds: string[] }>("/wishlist")
      .then(({ productIds }) => {
        if (cancelled) return;
        setWishlist((local) => [...new Set([...productIds, ...local])]);
        syncedUser.current = userId;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || syncedUser.current !== userId) return;
    const timer = setTimeout(() => {
      api.put("/wishlist", { productIds: wishlist }).catch(() => undefined);
    }, 400);
    return () => clearTimeout(timer);
  }, [wishlist, userId]);

  function toggleWishlist(productId: string) {
    setWishlist((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]));
  }

  function isWishlisted(productId: string) {
    return wishlist.includes(productId);
  }

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isWishlisted }}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
