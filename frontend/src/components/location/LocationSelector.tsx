import { MapPin, ChevronDown } from "lucide-react";
import { useLocationContext } from "@/context/LocationContext";

export function LocationSelector({ compact = false }: { compact?: boolean }) {
  const { location, openModal } = useLocationContext();

  return (
    <button
      type="button"
      onClick={openModal}
      className={
        compact
          ? "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-stone-700 hover:bg-primary-50"
          : "flex max-w-[9.5rem] items-center gap-1.5 rounded-full px-2.5 py-2 text-left text-stone-600 transition hover:bg-stone-100 sm:max-w-[12rem]"
      }
      aria-label="Choose delivery location"
    >
      <MapPin size={compact ? 16 : 18} className="shrink-0 text-primary-600" />
      <span
        className={
          compact
            ? "flex-1 truncate"
            : "hidden min-w-0 flex-1 truncate text-xs font-semibold leading-tight sm:inline sm:text-sm"
        }
      >
        {location ? location.label : "Set location"}
      </span>
      <ChevronDown size={14} className={compact ? "shrink-0 text-stone-400" : "hidden shrink-0 text-stone-400 sm:block"} />
    </button>
  );
}
