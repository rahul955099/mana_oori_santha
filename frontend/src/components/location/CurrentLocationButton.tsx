import { LocateFixed, Loader2, AlertCircle } from "lucide-react";
import { useLocationContext } from "@/context/LocationContext";

export function CurrentLocationButton() {
  const { detectCurrentLocation, detecting, detectError } = useLocationContext();

  return (
    <div>
      <button
        type="button"
        onClick={detectCurrentLocation}
        disabled={detecting}
        className="flex w-full items-center gap-3 rounded-xl border-2 border-primary-200 bg-primary-50 px-4 py-3.5 text-left text-sm font-bold text-primary-700 transition hover:border-primary-400 hover:bg-primary-100 disabled:cursor-wait disabled:opacity-70"
      >
        {detecting ? (
          <Loader2 size={18} className="shrink-0 animate-spin" />
        ) : (
          <LocateFixed size={18} className="shrink-0" />
        )}
        {detecting ? "Detecting your location…" : "Use my current location"}
      </button>
      {detectError && (
        <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-red-600">
          <AlertCircle size={14} className="mt-0.5 shrink-0" /> {detectError}
        </p>
      )}
    </div>
  );
}
