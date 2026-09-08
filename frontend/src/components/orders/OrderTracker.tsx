import { Check, XCircle, RotateCcw } from "lucide-react";
import type { OrderStatus } from "@/types";
import { ORDER_STATUS_LABELS, ORDER_TRACKING_STEPS, getTrackingStepIndex, isTerminalOffPathStatus } from "@/utils/orderStatus";

export function OrderTracker({ status }: { status: OrderStatus }) {
  if (isTerminalOffPathStatus(status)) {
    const isCancelled = status === "cancelled";
    return (
      <div
        className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold ${
          isCancelled ? "bg-red-50 text-red-700" : "bg-accent-50 text-accent-800"
        }`}
      >
        {isCancelled ? <XCircle size={18} /> : <RotateCcw size={18} />}
        {ORDER_STATUS_LABELS[status]}
      </div>
    );
  }

  const currentIndex = getTrackingStepIndex(status);

  return (
    <div className="flex items-start">
      {ORDER_TRACKING_STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const isLast = i === ORDER_TRACKING_STEPS.length - 1;
        return (
          <div key={step} className={`flex ${isLast ? "" : "flex-1"} items-start`}>
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done ? "bg-primary-600 text-white" : "bg-stone-200 text-stone-400"
                }`}
              >
                {done ? <Check size={14} /> : i + 1}
              </div>
              <p className={`mt-1.5 max-w-[70px] text-center text-[10px] font-semibold leading-tight sm:max-w-[90px] sm:text-xs ${done ? "text-primary-700" : "text-stone-400"}`}>
                {ORDER_STATUS_LABELS[step]}
              </p>
            </div>
            {!isLast && (
              <div className={`mt-3.5 h-0.5 flex-1 ${i < currentIndex ? "bg-primary-600" : "bg-stone-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
