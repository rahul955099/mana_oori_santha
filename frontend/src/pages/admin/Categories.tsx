import { categories, futureCategories } from "@/data/categories";
import { useProducts } from "@/context/ProductsContext";
import { Badge } from "@/components/common/Badge";

export default function AdminCategories() {
  const { products } = useProducts();

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Categories</h1>
      <p className="mt-1 text-sm text-stone-500">Manage the main product categories on the platform.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((cat) => {
          const count = products.filter((p) => p.category === cat.slug).length;
          return (
            <div key={cat.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <img src={cat.image} alt={cat.name} className="h-32 w-full object-cover" />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-stone-900">{cat.name}</h3>
                  <Badge tone="green">Active</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-stone-500">{cat.description}</p>
                <p className="mt-3 text-sm font-semibold text-primary-700">{count} products</p>
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mb-4 mt-10 text-lg font-bold text-stone-900">Planned Categories</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {futureCategories.map((cat) => (
          <div key={cat.id} className="overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-stone-50 opacity-75">
            <img src={cat.image} alt={cat.name} className="h-32 w-full object-cover grayscale" />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-700">{cat.name}</h3>
                <Badge tone="gray">Coming Soon</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-stone-500">{cat.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
