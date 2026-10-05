import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CircleCheck, X, ChevronRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { formatCurrency } from "@/utils/format";

const SHOW_FOR_MS = 5000;

/** Drops down from the header cart icon after something is added to the cart. */
export function AddedToCartPopup() {
  const { lastAdded, dismissAdded } = useCart();
  const { products } = useProducts();
  const { pathname } = useLocation();
  const [hovered, setHovered] = useState(false);
  const [openedOn, setOpenedOn] = useState(pathname);

  // Remember the page it opened on, so moving to another page closes it.
  const [lastKey, setLastKey] = useState(lastAdded?.key);
  if (lastAdded?.key !== lastKey) {
    setLastKey(lastAdded?.key);
    setOpenedOn(pathname);
  }

  const product = lastAdded ? products.find((p) => p.id === lastAdded.productId) : undefined;
  const open = !!lastAdded && !!product && pathname === openedOn && pathname !== "/cart";

  useEffect(() => {
    if (!open || hovered) return;
    const timer = setTimeout(dismissAdded, SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, [open, hovered, lastAdded?.key, dismissAdded]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismissAdded();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissAdded]);

  if (!open || !lastAdded || !product) return null;

  return (
    <div
      role="status"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="fixed inset-x-4 top-20 z-50 rounded-2xl border border-stone-100 bg-white p-5 shadow-2xl sm:absolute sm:inset-x-auto sm:-right-2 sm:top-full sm:mt-3 sm:w-96"
    >
      {/* Arrow pointing at the cart icon (on wider screens, where it sits right under it) */}
      <span className="absolute -top-2 right-6 hidden h-4 w-4 rotate-45 sm:block border-l border-t border-stone-100 bg-white" aria-hidden />

      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-bold text-primary-700">
          <CircleCheck size={20} className="fill-primary-600 text-white" /> Added to Cart
        </p>
        <button onClick={dismissAdded} aria-label="Close" className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600">
          <X size={18} />
        </button>
      </div>

      <div className="mt-4 flex gap-4">
        <img src={product.image} alt="" className="h-24 w-24 shrink-0 rounded-xl bg-stone-100 object-cover" />
        <div className="min-w-0">
          <p className="line-clamp-2 font-semibold text-stone-800">{product.name}</p>
          <p className="mt-0.5 text-sm text-stone-500">
            {lastAdded.size ? `Size ${lastAdded.size} · ` : `${product.unit} `}×{lastAdded.quantity}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-lg bg-primary-600 px-2.5 py-1 text-lg font-extrabold text-white">{formatCurrency(product.price)}</span>
            {product.mrp > product.price && <span className="text-sm text-stone-400 line-through">{formatCurrency(product.mrp)}</span>}
          </div>
        </div>
      </div>

      <Link
        to="/cart"
        onClick={dismissAdded}
        className="mt-5 flex items-center justify-center gap-1 rounded-xl border border-primary-200 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
      >
        Go to Cart <ChevronRight size={16} />
      </Link>
    </div>
  );
}
