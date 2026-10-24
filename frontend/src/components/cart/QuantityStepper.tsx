import type { MouseEvent } from "react";
import { Minus, Plus } from "lucide-react";
import type { Product } from "@/types";
import { useCart } from "@/context/CartContext";

interface QuantityStepperProps {
  product: Product;
  /** "card" is the compact pill on product cards; "page" is the larger product-page control. */
  variant?: "card" | "page";
}

/** "ADD" until the product is in the cart, then "− n +" showing the cart's own
 * quantity, so every card and page showing this product stays in step. */
export function QuantityStepper({ product, variant = "card" }: QuantityStepperProps) {
  const { addToCart, changeQuantity, quantityOf, maxQuantity } = useCart();
  const quantity = quantityOf(product.id);
  const max = maxQuantity(product.id);
  const purchasable = product.priceAvailable !== false && product.stock > 0;
  const card = variant === "card";

  // Cards sit inside a link to the product page; the buttons must not follow it.
  function handle(e: MouseEvent, action: () => void) {
    e.preventDefault();
    e.stopPropagation();
    action();
  }

  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={(e) => handle(e, () => purchasable && addToCart(product.id, 1))}
        disabled={!purchasable}
        aria-label={`Add ${product.name} to cart`}
        className={
          card
            ? "flex h-8 items-center gap-0.5 rounded-full border border-primary-600 bg-white px-3 text-[11px] font-extrabold text-primary-700 shadow-sm transition-all duration-150 hover:bg-primary-50 active:scale-95 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
            : "flex h-11 items-center gap-1.5 rounded-full border-2 border-primary-600 px-6 text-sm font-bold text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        <Plus size={card ? 12 : 16} strokeWidth={3} className="shrink-0" /> {card ? "ADD" : "Add to Cart"}
      </button>
    );
  }

  const atMax = quantity >= max;
  const buttonClass = `flex items-center justify-center text-white transition hover:bg-primary-700 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 ${
    card ? "h-8 w-8" : "h-11 w-11"
  }`;

  return (
    <div
      role="group"
      aria-label={`${product.name} quantity in cart`}
      className={`flex items-center overflow-hidden rounded-full bg-primary-600 shadow-sm ${card ? "" : "shadow-md"}`}
      onClick={(e) => {
        // Taps on the gap between buttons shouldn't open the product page either.
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        onClick={(e) => handle(e, () => changeQuantity(product.id, -1))}
        aria-label={quantity === 1 ? `Remove ${product.name} from cart` : `Decrease quantity of ${product.name}`}
        className={buttonClass}
      >
        <Minus size={card ? 13 : 16} strokeWidth={3} />
      </button>
      <span aria-live="polite" className={`text-center font-extrabold text-white ${card ? "min-w-5 text-xs" : "min-w-8 text-sm"}`}>
        {quantity}
      </span>
      <button
        type="button"
        onClick={(e) => handle(e, () => changeQuantity(product.id, 1))}
        disabled={atMax}
        aria-label={atMax ? `No more ${product.name} in stock` : `Increase quantity of ${product.name}`}
        title={atMax ? `Only ${max} available` : undefined}
        className={buttonClass}
      >
        <Plus size={card ? 13 : 16} strokeWidth={3} />
      </button>
    </div>
  );
}
