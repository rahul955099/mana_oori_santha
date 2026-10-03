import { useMemo, useState } from "react";
import { Pencil, Trash2, Eye } from "lucide-react";
import { useProducts } from "@/context/ProductsContext";
import { useSellers } from "@/context/SellersContext";
import { useToast } from "@/context/ToastContext";
import { errorMessage } from "@/lib/api";
import { useCategories } from "@/context/CategoriesContext";
import { SearchBar } from "@/components/common/SearchBar";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import { ProductForm, type ProductFormValues } from "@/components/ProductForm";
import { buttonClasses } from "@/components/common/Button";
import { formatCurrency, categoryLabel } from "@/utils/format";
import type { Product } from "@/types";

export default function AdminProducts() {
  const { categories } = useCategories();
  const { products, updateProduct, deleteProduct } = useProducts();
  const { showToast } = useToast();
  const { sellers } = useSellers();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [viewTarget, setViewTarget] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  async function handleEditSubmit(values: ProductFormValues) {
    if (!editTarget) return;
    try {
      await updateProduct(editTarget.id, values);
      showToast("Product updated");
      setEditTarget(null);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget.id);
      showToast(`${deleteTarget.name} deleted`);
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">All Products</h1>
      <p className="mt-1 text-sm text-stone-500">Manage every product listed on the marketplace.</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <SearchBar value={search} onChange={setSearch} className="flex-1" suggestions={false} />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-600 outline-none focus:border-primary-400"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50">
              <tr className="text-xs font-bold uppercase text-stone-400">
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Seller</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">Stock</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const seller = sellers.find((s) => s.id === product.sellerId);
                return (
                  <tr key={product.id} className="border-t border-stone-100">
                    <td className="flex items-center gap-3 px-5 py-3">
                      <img src={product.image} alt={product.name} className="h-10 w-10 rounded-lg object-cover" />
                      <span className="font-semibold text-stone-800">{product.name}</span>
                    </td>
                    <td className="px-5 py-3 text-stone-500">{seller?.farmName ?? "-"}</td>
                    <td className="px-5 py-3 text-stone-500">{categoryLabel(product.category)}</td>
                    <td className="px-5 py-3 font-semibold text-stone-800">{formatCurrency(product.price)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={product.stock > 0 ? "green" : "red"}>{product.stock > 0 ? "In Stock" : "Out"}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setViewTarget(product)} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-blue-50 hover:text-blue-600">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => setEditTarget(product)} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-primary-50 hover:text-primary-700">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setDeleteTarget(product)} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-red-50 hover:text-red-600">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!viewTarget} onClose={() => setViewTarget(null)} title={viewTarget?.name}>
        {viewTarget && (
          <div className="space-y-3">
            <img src={viewTarget.image} alt={viewTarget.name} className="h-48 w-full rounded-xl object-cover" />
            <p className="text-sm text-stone-600">{viewTarget.description}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p><span className="text-stone-400">Price:</span> <span className="font-semibold">{formatCurrency(viewTarget.price)}</span></p>
              <p><span className="text-stone-400">Stock:</span> <span className="font-semibold">{viewTarget.stock}</span></p>
              <p><span className="text-stone-400">Rating:</span> <span className="font-semibold">{viewTarget.rating}</span></p>
              <p><span className="text-stone-400">Category:</span> <span className="font-semibold">{categoryLabel(viewTarget.category)}</span></p>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Product">
        {editTarget && <ProductForm initial={editTarget} onSubmit={handleEditSubmit} submitLabel="Save Changes" canFeature />}
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Product">
        <p className="text-sm text-stone-600">
          Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className={buttonClasses("ghost", "sm")}>Cancel</button>
          <button onClick={confirmDelete} className={buttonClasses("danger", "sm")}>Delete</button>
        </div>
      </Modal>
    </div>
  );
}
