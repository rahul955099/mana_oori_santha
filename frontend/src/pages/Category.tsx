import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useProducts } from "@/context/ProductsContext";
import { categories } from "@/data/categories";
import { ProductCard } from "@/components/ProductCard";
import { SearchBar } from "@/components/common/SearchBar";
import { EmptyState } from "@/components/common/EmptyState";

type SortOption = "relevance" | "price-low" | "price-high" | "rating";

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const { products } = useProducts();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("relevance");

  const category = categories.find((c) => c.slug === slug);

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.category === slug);
    list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
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
  }, [products, slug, search, sort]);

  if (!category) {
    return (
      <div className="container-app py-16">
        <EmptyState
          title="Category not found"
          description="This category doesn't exist yet."
          action={
            <Link to="/products" className="mt-2 text-sm font-bold text-primary-700 hover:underline">
              Browse all products
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-56 overflow-hidden sm:h-72">
        <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900/55 px-4 text-center text-white">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{category.name}</h1>
          <p className="mt-2 max-w-lg text-sm text-white/85 sm:text-base">{category.description}</p>
        </div>
      </div>

      <div className="container-app py-10">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-stone-400">
          <Link to="/" className="hover:text-primary-600">Home</Link> /
          <Link to="/products" className="hover:text-primary-600">Products</Link> /
          <span className="text-stone-600">{category.name}</span>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-stone-500">
            {filtered.length} product{filtered.length !== 1 ? "s" : ""} in {category.name}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchBar value={search} onChange={setSearch} className="sm:w-64" placeholder="Search in category..." />
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
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No products found" description="Try a different search term." />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
