import { useEffect, useState } from "react";
import { Tag, X, ChevronDown } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCoupons } from "@/context/CouponsContext";
import { useProducts } from "@/context/ProductsContext";
import { useToast } from "@/context/ToastContext";
import { formatCurrency } from "@/utils/format";

/** Coupon apply/remove box shared by Cart and Checkout, backed by CartContext
 * (so the applied code carries over between the two pages) and the
 * configurable CouponsContext data (Admin → Coupons/Offers). */
export function CouponBox({ onDiscountChange }: { onDiscountChange: (discount: number) => void }) {
  const { items, subtotal, couponCode, applyCouponCode, removeCouponCode } = useCart();
  const { activeCoupons, validateCoupon } = useCoupons();
  const { products } = useProducts();
  const { showToast } = useToast();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [showOffers, setShowOffers] = useState(false);

  const appliedResult = couponCode ? validateCoupon(couponCode, items, products, subtotal) : null;
  const currentDiscount = appliedResult?.valid ? appliedResult.discount : 0;

  // Keep the parent's total in sync whenever cart contents change the discount —
  // done in an effect (not during render) to avoid updating a different
  // component's state while this one is rendering.
  useEffect(() => {
    onDiscountChange(currentDiscount);
  }, [currentDiscount, onDiscountChange]);

  function handleApply(code: string) {
    const result = validateCoupon(code, items, products, subtotal);
    if (!result.valid) {
      setError(result.message);
      return;
    }
    applyCouponCode(code.trim().toUpperCase());
    setError("");
    setInput("");
    setShowOffers(false);
    showToast(result.message);
  }

  function handleRemove() {
    removeCouponCode();
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-800">
        <Tag size={16} className="text-primary-600" /> Have a coupon?
      </div>

      {couponCode && appliedResult?.valid ? (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-primary-50 px-3 py-2.5">
          <div>
            <p className="text-sm font-bold text-primary-800">{couponCode}</p>
            <p className="text-xs text-primary-600">You saved {formatCurrency(appliedResult.discount)}</p>
          </div>
          <button onClick={handleRemove} className="rounded-full p-1.5 text-primary-600 hover:bg-primary-100" aria-label="Remove coupon">
            <X size={15} />
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter coupon code"
              className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm uppercase outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
            <button
              type="button"
              onClick={() => handleApply(input)}
              disabled={!input.trim()}
              className="shrink-0 rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              Apply
            </button>
          </div>
          {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}

          <button
            type="button"
            onClick={() => setShowOffers((v) => !v)}
            className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline"
          >
            View available offers <ChevronDown size={13} className={showOffers ? "rotate-180" : ""} />
          </button>
          {showOffers && (
            <div className="mt-2 space-y-2">
              {activeCoupons.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-stone-200 px-3 py-2">
                  <div>
                    <p className="text-xs font-bold text-stone-800">{c.code}</p>
                    <p className="text-[11px] text-stone-500">{c.description}</p>
                  </div>
                  <button
                    onClick={() => handleApply(c.code)}
                    className="shrink-0 rounded-full border border-primary-500 px-3 py-1 text-[11px] font-bold text-primary-700 hover:bg-primary-50"
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
