import { useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import type { LocationSuggestion } from "@/types";
import { searchLocations } from "@/data/locations";

export function LocationSearch({ onSelect }: { onSelect: (suggestion: LocationSuggestion) => void }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchLocations(query), [query]);

  return (
    <div>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search city, area or pincode…"
          className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-4 text-sm text-stone-700 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
      </div>

      {query.trim() && (
        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-stone-100">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-stone-400">No matching location found.</p>
          ) : (
            results.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => onSelect(loc)}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-stone-700 transition hover:bg-primary-50 hover:text-primary-700"
              >
                <MapPin size={14} className="shrink-0 text-stone-400" />
                <span>
                  {loc.city}
                  {loc.area ? `, ${loc.area}` : ""}, <span className="text-stone-400">{loc.state}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
