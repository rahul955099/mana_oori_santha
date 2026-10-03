import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import { useProducts } from "@/context/ProductsContext";
import { useCategories } from "@/context/CategoriesContext";
import { ProductCard } from "@/components/ProductCard";
import { SearchBar } from "@/components/common/SearchBar";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import type { CategorySlug } from "@/types";

type SortOption = "relevance" | "price-low" | "price-high" | "rating";

export default function Products() {
  const { categories } = useCategories();
  const { products, loading, error, reload } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [selectedCategories, setSelectedCategories] = useState<CategorySlug[]>([]);
  const highestPrice = useMemo(
    () => products.reduce((max, p) => Math.max(max, p.price), 1000),
    [products]
  );
  // null = no limit chosen yet, so the slider follows the catalog once it loads.
  const [chosenMaxPrice, setMaxPrice] = useState<number | null>(null);
  const maxPrice = chosenMaxPrice ?? highestPrice;
  const [sort, setSort] = useState<SortOption>("relevance");
  const [filtersOpen, setFiltersOpen] = useState(false);

  function toggleCategory(slug: CategorySlug) {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setSearchParams(value ? { search: value } : {});
  }

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (selectedCategories.length > 0) {
      list = list.filter((p) => selectedCategories.includes(p.category));
    }
    list = list.filter((p) => p.price <= maxPrice);

    switch (sort) {
      case "price-low":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list = [...list].sort((a, b) => b.rating - a.rating);
        break;
    }
    return list;
  }, [products, search, selectedCategories, maxPrice, sort]);

  function clearFilters() {
    setSelectedCategories([]);
    setMaxPrice(null);
    setSort("relevance");
    handleSearchChange("");
  }

  const FilterPanel = (
    <div className="space-y-7">
      <div>
        <h4 className="mb-3 text-sm font-bold text-stone-800">Category</h4>
        <div className="space-y-2.5">
          {categories.map((cat) => (
            <label key={cat.id} className="flex cursor-pointer items-center gap-2.5 text-sm text-stone-600">
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat.slug)}
                onChange={() => toggleCategory(cat.slug)}
                className="h-4 w-4 rounded border-stone-300 text-primary-600 focus:ring-primary-400"
              />
              {cat.name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-bold text-stone-800">Max Price: ₹{maxPrice}</h4>
        <input
          type="range"
          min={50}
          max={highestPrice}
          step={10}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-primary-600"
        />
        <div className="mt-1 flex justify-between text-xs text-stone-400">
          <span>₹50</span>
          <span>₹{highestPrice}</span>
        </div>
      </div>

      <button onClick={clearFilters} className="text-sm font-semibold text-earth-600 hover:underline">
        Clear All Filters
      </button>
    </div>
  );

  return (
    <div className="container-app py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-stone-900">All Products</h1>
        <p className="mt-1 text-sm text-stone-500">
          {filtered.length} product{filtered.length !== 1 ? "s" : ""} found
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar value={search} onChange={handleSearchChange} className="flex-1" />
        <div className="flex gap-3">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-600 outline-none focus:border-primary-400"
          >
            <option value="relevance">Sort: Relevance</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
          <button
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-600 lg:hidden"
          >
            <SlidersHorizontal size={16} /> Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden rounded-2xl border border-stone-200 bg-white p-5 lg:block">{FilterPanel}</aside>

        {filtersOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="absolute inset-0 bg-stone-900/50" onClick={() => setFiltersOpen(false)} />
            <div className="relative ml-auto h-full w-72 overflow-y-auto bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-stone-900">Filters</h3>
                <button onClick={() => setFiltersOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              {FilterPanel}
            </div>
          </div>
        )}

        <div>
          {loading ? (
            <Loading label="Loading products..." />
          ) : error ? (
            <EmptyState
              title="Couldn't load products"
              description={error}
              action={
                <button onClick={() => void reload()} className="mt-2 text-sm font-bold text-primary-700 hover:underline">
                  Try again
                </button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No products found"
              description="Try adjusting your search or filters to find what you're looking for."
              action={
                <button onClick={clearFilters} className="mt-2 text-sm font-bold text-primary-700 hover:underline">
                  Clear filters
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
