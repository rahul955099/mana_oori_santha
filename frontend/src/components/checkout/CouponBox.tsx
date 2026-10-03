import { useState } from "react";
import { Tag, X, ChevronDown } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCoupons } from "@/context/CouponsContext";
import { useToast } from "@/context/ToastContext";
import { api, errorMessage } from "@/lib/api";
import { formatCurrency } from "@/utils/format";
import type { CartQuote } from "@/types";

/** Coupon apply/remove box shared by Cart and Checkout. The applied code lives
 * in CartContext (so it carries over between pages) and the server decides
 * whether it applies to the current cart. */
export function CouponBox() {
  const { items, couponCode, applyCouponCode, removeCouponCode, quote } = useCart();
  const { activeCoupons } = useCoupons();
  const { showToast } = useToast();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [showOffers, setShowOffers] = useState(false);

  const applied = couponCode && quote?.coupon?.code === couponCode ? quote.coupon : null;

  async function handleApply(code: string) {
    setChecking(true);
    setError("");
    try {
      const result = await api.post<CartQuote>("/orders/quote", { items, couponCode: code.trim() });
      if (!result.coupon?.valid) {
        setError(result.coupon?.message ?? "Invalid coupon code.");
        return;
      }
      applyCouponCode(code);
      setInput("");
      setShowOffers(false);
      showToast(result.coupon.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-800">
        <Tag size={16} className="text-primary-600" /> Have a coupon?
      </div>

      {couponCode ? (
        <div
          className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 ${
            applied && !applied.valid ? "bg-red-50" : "bg-primary-50"
          }`}
        >
          <div>
            <p className={`text-sm font-bold ${applied && !applied.valid ? "text-red-700" : "text-primary-800"}`}>{couponCode}</p>
            {applied?.valid && <p className="text-xs text-primary-600">You saved {formatCurrency(applied.discount)}</p>}
            {applied && !applied.valid && <p className="text-xs text-red-600">{applied.message}</p>}
          </div>
          <button onClick={removeCouponCode} className="rounded-full p-1.5 text-primary-600 hover:bg-primary-100" aria-label="Remove coupon">
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
              disabled={!input.trim() || checking}
              className="shrink-0 rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {checking ? "..." : "Apply"}
            </button>
          </div>
          {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}

          {activeCoupons.length > 0 && (
            <button
              type="button"
              onClick={() => setShowOffers((v) => !v)}
              className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline"
            >
              View available offers <ChevronDown size={13} className={showOffers ? "rotate-180" : ""} />
            </button>
          )}
          {showOffers && (
            <div className="mt-2 space-y-2">
              {activeCoupons.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-stone-200 px-3 py-2">
                  <div>
                    <p className="text-xs font-bold text-stone-800">{c.code}</p>
                    <p className="text-[11px] text-stone-500">{c.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApply(c.code)}
                    disabled={checking}
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
