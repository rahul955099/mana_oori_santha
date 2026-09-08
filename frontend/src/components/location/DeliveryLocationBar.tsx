import { MapPin } from "lucide-react";
import { useLocationContext } from "@/context/LocationContext";

/** Reusable "Delivery Location … Change" row — used at checkout and anywhere
 * else the selected delivery location needs to be shown/changed. Opens the
 * same LocationModal used from the navbar, so there's a single location UI. */
export function DeliveryLocationBar() {
  const { location, openModal } = useLocationContext();

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
          <MapPin size={18} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-stone-400">Delivery Location</p>
          <p className="text-sm font-bold text-stone-800">
            {location ? location.label : "No location selected"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={openModal}
        className="shrink-0 rounded-full border border-primary-600 px-4 py-1.5 text-xs font-bold text-primary-700 transition hover:bg-primary-50"
      >
        Change
      </button>
    </div>
  );
}
