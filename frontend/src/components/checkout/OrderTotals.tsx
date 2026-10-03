import { AlertTriangle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { formatCurrency } from "@/utils/format";
import type { CartProblem } from "@/types";

/** Shown in the "add more for free delivery" hint. The server applies the
 * real rule (FREE_DELIVERY_ABOVE in the backend .env); keep the two in step. */
const FREE_DELIVERY_ABOVE = 500;

function problemText(problem: CartProblem, name: string) {
  switch (problem.reason) {
    case "out-of-stock":
      return `${name} is out of stock. Please remove it.`;
    case "insufficient-stock":
      return `Only ${problem.available} of ${name} left. Please reduce the quantity.`;
    case "no-price":
      return `${name} isn't available to order yet.`;
    default:
      return `${name} is no longer available.`;
  }
}

/** Price breakdown from the server's quote, plus any stock problems. */
export function OrderTotals() {
  const { quote, subtotal: estimate, couponCode } = useCart();
  const { getProductById } = useProducts();

  const subtotal = quote?.subtotal ?? estimate;
  const discount = quote?.discount ?? 0;
  const deliveryCharge = quote?.deliveryCharge ?? null;
  const total = quote?.total ?? null;

  return (
    <div className="space-y-3 text-sm">
      {quote?.problems.map((p) => (
        <p key={p.productId} className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {problemText(p, p.name ?? getProductById(p.productId)?.name ?? "An item")}
        </p>
      ))}
      <div className="flex justify-between text-stone-600">
        <span>Subtotal</span>
        <span className="font-semibold text-stone-900">{formatCurrency(subtotal)}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-primary-700">
          <span>Coupon Discount {couponCode ? `(${couponCode})` : ""}</span>
          <span className="font-semibold">-{formatCurrency(discount)}</span>
        </div>
      )}
      <div className="flex justify-between text-stone-600">
        <span>Delivery Charge</span>
        <span className={`font-semibold ${deliveryCharge === 0 ? "text-primary-600" : "text-stone-900"}`}>
          {deliveryCharge === null ? "—" : deliveryCharge === 0 ? "FREE" : formatCurrency(deliveryCharge)}
        </span>
      </div>
      {deliveryCharge !== null && deliveryCharge > 0 && subtotal < FREE_DELIVERY_ABOVE && (
        <p className="rounded-lg bg-accent-50 px-3 py-2 text-xs text-accent-700">
          Add {formatCurrency(FREE_DELIVERY_ABOVE - subtotal)} more for free delivery!
        </p>
      )}
      <div className="flex justify-between border-t border-stone-200 pt-3 text-base font-extrabold text-stone-900">
        <span>Total</span>
        <span>{total === null ? "—" : formatCurrency(total)}</span>
      </div>
    </div>
  );
}
