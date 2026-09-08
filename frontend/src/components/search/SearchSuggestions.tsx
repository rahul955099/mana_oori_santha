import { Link } from "react-router-dom";
import { Clock, TrendingUp, Search, Package, LayoutGrid, Store } from "lucide-react";
import { useProducts } from "@/context/ProductsContext";
import { useSellers } from "@/context/SellersContext";
import { categories } from "@/data/categories";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { POPULAR_SEARCH_TERMS } from "@/data/searchTerms";
import { categoryLabel } from "@/utils/format";

interface SearchSuggestionsProps {
  query: string;
  onSelectTerm: (term: string) => void;
  onNavigate?: () => void;
}

const MAX_MATCHES = 3;

export function SearchSuggestions({ query, onSelectTerm, onNavigate }: SearchSuggestionsProps) {
  const { products } = useProducts();
  const { sellers } = useSellers();
  const { recentSearches } = useRecentSearches();

  const trimmed = query.trim().toLowerCase();

  if (!trimmed) {
    if (recentSearches.length === 0 && POPULAR_SEARCH_TERMS.length === 0) return null;
    return (
      <div className="py-2">
        {recentSearches.length > 0 && (
          <div className="px-3 pb-2">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-stone-400">
              <Clock size={12} /> Recent Searches
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recentSearches.map((term) => (
                <button
                  key={term}
                  onClick={() => onSelectTerm(term)}
                  className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600 hover:bg-primary-50 hover:text-primary-700"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="px-3 pt-1">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-stone-400">
            <TrendingUp size={12} /> Popular Searches
          </p>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_SEARCH_TERMS.map((term) => (
              <button
                key={term}
                onClick={() => onSelectTerm(term)}
                className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600 hover:bg-primary-50 hover:text-primary-700"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const matchedProducts = products.filter((p) => p.name.toLowerCase().includes(trimmed)).slice(0, MAX_MATCHES);
  const matchedCategories = categories.filter((c) => c.name.toLowerCase().includes(trimmed)).slice(0, MAX_MATCHES);
  const matchedSellers = sellers.filter((s) => s.farmName.toLowerCase().includes(trimmed) || s.name.toLowerCase().includes(trimmed)).slice(0, MAX_MATCHES);

  const hasMatches = matchedProducts.length > 0 || matchedCategories.length > 0 || matchedSellers.length > 0;

  if (!hasMatches) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm font-semibold text-stone-600">No results for "{query}"</p>
        <p className="mt-1 text-xs text-stone-400">Try a different product, category or seller name.</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      {matchedProducts.length > 0 && (
        <div>
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-stone-400">Products</p>
          {matchedProducts.map((p) => (
            <Link
              key={p.id}
              to={`/products/${p.slug}`}
              onClick={onNavigate}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-primary-50 hover:text-primary-700"
            >
              <Package size={14} className="shrink-0 text-stone-400" /> {p.name}
            </Link>
          ))}
        </div>
      )}
      {matchedCategories.length > 0 && (
        <div>
          <p className="px-3 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-stone-400">Categories</p>
          {matchedCategories.map((c) => (
            <Link
              key={c.id}
              to={`/category/${c.slug}`}
              onClick={onNavigate}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-primary-50 hover:text-primary-700"
            >
              <LayoutGrid size={14} className="shrink-0 text-stone-400" /> {categoryLabel(c.slug)}
            </Link>
          ))}
        </div>
      )}
      {matchedSellers.length > 0 && (
        <div>
          <p className="px-3 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-stone-400">Sellers</p>
          {matchedSellers.map((s) => (
            <Link
              key={s.id}
              to={`/sellers/${s.id}`}
              onClick={onNavigate}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-primary-50 hover:text-primary-700"
            >
              <Store size={14} className="shrink-0 text-stone-400" /> {s.farmName}
            </Link>
          ))}
        </div>
      )}
      <button
        onClick={() => onSelectTerm(query)}
        className="mt-1 flex w-full items-center gap-2.5 border-t border-stone-100 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
      >
        <Search size={14} /> Search for "{query}"
      </button>
    </div>
  );
}
