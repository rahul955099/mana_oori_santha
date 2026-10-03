import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CartItem, CartQuote } from "@/types";
import { useProducts } from "@/context/ProductsContext";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

interface CartContextValue {
  items: CartItem[];
  addToCart: (productId: string, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  /** Instant estimate from the loaded catalog; `quote` is the authoritative total. */
  subtotal: number;
  couponCode: string | null;
  applyCouponCode: (code: string) => void;
  removeCouponCode: () => void;
  /** Server-calculated prices, coupon result and stock problems for the current cart. */
  quote: CartQuote | null;
  quoteLoading: boolean;
  refreshQuote: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "mos_cart";
const COUPON_STORAGE_KEY = "mos_cart_coupon";
const MAX_QUANTITY = 99;

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Combines a guest cart with the account's saved cart, keeping the larger quantity of each product. */
function mergeCarts(a: CartItem[], b: CartItem[]): CartItem[] {
  const merged = new Map<string, number>();
  for (const item of [...a, ...b]) {
    merged.set(item.productId, Math.max(merged.get(item.productId) ?? 0, item.quantity));
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { products, loading: productsLoading, error: productsError } = useProducts();
  const [items, setItems] = useState<CartItem[]>(() => readStorage<CartItem[]>(STORAGE_KEY, []));
  const [couponCode, setCouponCode] = useState<string | null>(() => readStorage<string | null>(COUPON_STORAGE_KEY, null));
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  /** The user whose server cart has been loaded; edits are saved to the server only after that. */
  const syncedUser = useRef<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(couponCode));
    } catch {
      // Storage unavailable — the cart still works for this visit.
    }
  }, [items, couponCode]);

  // On login, merge the guest cart into the account's cart; on logout, empty
  // the cart so the next person on this device doesn't see it.
  useEffect(() => {
    if (!userId) {
      if (syncedUser.current) {
        setItems([]);
        setCouponCode(null);
      }
      syncedUser.current = null;
      return;
    }
    let cancelled = false;
    api
      .get<{ items: CartItem[]; couponCode: string | null }>("/cart")
      .then((server) => {
        if (cancelled) return;
        setItems((local) => mergeCarts(server.items, local));
        setCouponCode((local) => local ?? server.couponCode);
        syncedUser.current = userId;
      })
      .catch(() => {
        // Keep the local cart; it will be saved on the next edit attempt after reload.
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Save edits to the account (debounced) once the server cart has been merged in.
  useEffect(() => {
    if (!userId || syncedUser.current !== userId) return;
    const timer = setTimeout(() => {
      api.put("/cart", { items, couponCode }).catch(() => {
        // Non-fatal: the local copy is kept and saved again on the next change.
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [items, couponCode, userId]);

  // Drop items whose product no longer exists (deleted, or left over from the
  // old demo catalog). Only once the catalog has loaded successfully, so a
  // network failure never empties someone's cart.
  useEffect(() => {
    if (productsLoading || productsError) return;
    const known = new Set(products.map((p) => p.id));
    setItems((prev) => (prev.every((i) => known.has(i.productId)) ? prev : prev.filter((i) => known.has(i.productId))));
  }, [products, productsLoading, productsError]);

  const refreshQuote = useCallback(async () => {
    if (items.length === 0) {
      setQuote(null);
      return;
    }
    setQuoteLoading(true);
    try {
      setQuote(await api.post<CartQuote>("/orders/quote", { items, couponCode: couponCode ?? undefined }));
    } catch {
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [items, couponCode]);

  // Re-price whenever the cart, coupon or logged-in user changes (per-customer coupon limits).
  useEffect(() => {
    const timer = setTimeout(() => void refreshQuote(), 250);
    return () => clearTimeout(timer);
  }, [refreshQuote, userId]);

  function maxFor(productId: string) {
    const stock = products.find((p) => p.id === productId)?.stock;
    return Math.min(MAX_QUANTITY, stock ?? MAX_QUANTITY);
  }

  function addToCart(productId: string, quantity = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        const next = Math.min(existing.quantity + quantity, maxFor(productId));
        return prev.map((i) => (i.productId === productId ? { ...i, quantity: next } : i));
      }
      return [...prev, { productId, quantity: Math.min(quantity, maxFor(productId)) }];
    });
  }

  function removeFromCart(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const capped = Math.min(quantity, maxFor(productId));
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: capped } : i)));
  }

  function clearCart() {
    setItems([]);
    setCouponCode(null);
  }

  function applyCouponCode(code: string) {
    setCouponCode(code.trim().toUpperCase());
  }

  function removeCouponCode() {
    setCouponCode(null);
  }

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, i) => {
      const product = products.find((p) => p.id === i.productId);
      return sum + (product ? product.price * i.quantity : 0);
    }, 0);
  }, [items, products]);

  const value: CartContextValue = {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    subtotal,
    couponCode,
    applyCouponCode,
    removeCouponCode,
    quote,
    quoteLoading,
    refreshQuote,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
