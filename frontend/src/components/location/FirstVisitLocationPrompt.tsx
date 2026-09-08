import { MapPin, X, LocateFixed } from "lucide-react";
import { useLocationContext } from "@/context/LocationContext";

/** Small, dismissible corner card shown once on first visit when no delivery
 * location is saved yet. Never blocks the page, and never reappears once the
 * user dismisses it or picks a location. */
export function FirstVisitLocationPrompt() {
  const { showFirstVisitPrompt, dismissFirstVisitPrompt, openModal, detectCurrentLocation, detecting } =
    useLocationContext();

  if (!showFirstVisitPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-sm animate-[slideUpIn_0.25s_ease-out] rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl sm:bottom-6 sm:left-6 sm:right-auto">
      <button
        type="button"
        onClick={dismissFirstVisitPrompt}
        aria-label="Dismiss"
        className="absolute right-3 top-3 rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
      >
        <X size={16} />
      </button>
      <div className="flex items-start gap-3 pr-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
          <MapPin size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-stone-900">Set your delivery location</p>
          <p className="mt-1 text-xs text-stone-500">
            Choose your location to see products and delivery options available near you.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={detectCurrentLocation}
          disabled={detecting}
          className="flex items-center gap-1.5 rounded-full bg-primary-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-700 disabled:opacity-60"
        >
          <LocateFixed size={13} /> {detecting ? "Detecting…" : "Use Current Location"}
        </button>
        <button
          type="button"
          onClick={openModal}
          className="rounded-full border border-stone-300 px-4 py-2 text-xs font-bold text-stone-600 transition hover:bg-stone-50"
        >
          Select Location
        </button>
        <button
          type="button"
          onClick={dismissFirstVisitPrompt}
          className="rounded-full px-4 py-2 text-xs font-bold text-stone-400 transition hover:text-stone-600"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
