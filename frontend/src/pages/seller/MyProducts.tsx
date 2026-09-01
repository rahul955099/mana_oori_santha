import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { useProducts } from "@/context/ProductsContext";
import { useToast } from "@/context/ToastContext";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import { buttonClasses } from "@/components/common/Button";
import { formatCurrency, categoryLabel } from "@/utils/format";
import { CURRENT_SELLER_ID } from "@/data/currentSeller";

export default function SellerMyProducts() {
  const { products, deleteProduct } = useProducts();
  const { showToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const myProducts = products.filter((p) => p.sellerId === CURRENT_SELLER_ID);

  function confirmDelete() {
    if (deleteTarget) {
      const product = products.find((p) => p.id === deleteTarget);
      deleteProduct(deleteTarget);
      showToast(`${product?.name ?? "Product"} deleted`);
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">My Products</h1>
          <p className="mt-1 text-sm text-stone-500">Manage all products listed under your store.</p>
        </div>
        <Link to="/seller/products/add" className={buttonClasses("primary", "md")}>
          <Plus size={16} /> Add Product
        </Link>
      </div>

      {myProducts.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add your first product to start selling on Mana Oori Santha."
          action={
            <Link to="/seller/products/add" className={buttonClasses("primary", "md", "mt-2")}>
              <Plus size={16} /> Add Product
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50">
                <tr className="text-xs font-bold uppercase text-stone-400">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Price</th>
                  <th className="px-5 py-3">Stock</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {myProducts.map((product) => (
                  <tr key={product.id} className="border-t border-stone-100">
                    <td className="flex items-center gap-3 px-5 py-3">
                      <img src={product.image} alt={product.name} className="h-10 w-10 rounded-lg object-cover" />
                      <span className="font-semibold text-stone-800">{product.name}</span>
                    </td>
                    <td className="px-5 py-3 text-stone-500">{categoryLabel(product.category)}</td>
                    <td className="px-5 py-3 font-semibold text-stone-800">
                      {formatCurrency(product.price)} / {product.unit}
                    </td>
                    <td className="px-5 py-3 text-stone-500">{product.stock}</td>
                    <td className="px-5 py-3">
                      <Badge tone={product.stock > 0 ? "green" : "red"}>
                        {product.stock > 0 ? "In Stock" : "Out of Stock"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/seller/products/edit/${product.id}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-primary-50 hover:text-primary-700"
                        >
                          <Pencil size={15} />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(product.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Product">
        <p className="text-sm text-stone-600">
          Are you sure you want to delete this product? This action cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className={buttonClasses("ghost", "sm")}>
            Cancel
          </button>
          <button onClick={confirmDelete} className={buttonClasses("danger", "sm")}>
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
