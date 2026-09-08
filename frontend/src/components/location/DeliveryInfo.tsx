import { PackageCheck, Clock, Wallet } from "lucide-react";
import { useLocationContext } from "@/context/LocationContext";
import { getDeliveryEstimate } from "@/utils/delivery";
import { formatCurrency } from "@/utils/format";

/** Small "Delivery available / Estimated delivery / Delivery charge" strip.
 * Reads the live estimate from utils/delivery.ts so real backend rules can
 * be plugged in later without touching this component. */
export function DeliveryInfo() {
  const { location } = useLocationContext();
  const estimate = getDeliveryEstimate(location);

  return (
    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-sm sm:grid-cols-3">
      <div className="flex items-center gap-2.5">
        <PackageCheck size={17} className={estimate.available ? "text-primary-600" : "text-stone-300"} />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Delivery</p>
          <p className={`font-bold ${estimate.available ? "text-primary-700" : "text-stone-400"}`}>
            {estimate.available ? "Available" : "Set location"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <Clock size={17} className="text-stone-400" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Estimated</p>
          <p className="font-bold text-stone-800">{estimate.etaLabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <Wallet size={17} className="text-stone-400" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Delivery charge</p>
          <p className="font-bold text-stone-800">
            {estimate.charge === null ? "Calculated at checkout" : formatCurrency(estimate.charge)}
          </p>
        </div>
      </div>
    </div>
  );
}
