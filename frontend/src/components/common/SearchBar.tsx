import { useState } from "react";
import { Search } from "lucide-react";
import { useRotatingPlaceholder } from "@/hooks/useRotatingPlaceholder";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { ROTATING_PLACEHOLDER_TERMS } from "@/data/searchTerms";
import { SearchSuggestions } from "@/components/search/SearchSuggestions";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Show the recent/popular/matches suggestions dropdown. Defaults to true. */
  suggestions?: boolean;
}

export function SearchBar({ value, onChange, placeholder, className = "", suggestions = true }: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const { addRecentSearch } = useRecentSearches();
  // Only rotate the placeholder when the caller didn't pass a specific one —
  // page-specific placeholders (e.g. "Search in category...") stay static.
  const rotatingPlaceholder = useRotatingPlaceholder(ROTATING_PLACEHOLDER_TERMS, value.length > 0);
  const effectivePlaceholder = placeholder ?? rotatingPlaceholder;

  function selectTerm(term: string) {
    onChange(term);
    addRecentSearch(term);
    setFocused(false);
  }

  return (
    <div className={`relative ${className}`}>
      <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) addRecentSearch(value);
        }}
        placeholder={effectivePlaceholder}
        className="w-full rounded-full border border-stone-200 bg-white py-3 pl-11 pr-4 text-sm text-stone-700 shadow-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
      />
      {suggestions && focused && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-stone-100 bg-white shadow-2xl">
          <SearchSuggestions query={value} onSelectTerm={selectTerm} />
        </div>
      )}
    </div>
  );
}
