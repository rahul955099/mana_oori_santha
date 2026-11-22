import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Pencil, Trash2, Eye, Check, X, Plus, ArrowLeft } from "lucide-react";
import { useProducts } from "@/context/ProductsContext";
import { useSellers } from "@/context/SellersContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, errorMessage } from "@/lib/api";
import { useCategories } from "@/context/CategoriesContext";
import { SearchBar } from "@/components/common/SearchBar";
import { Badge } from "@/components/common/Badge";
import { ApprovalBadge } from "@/components/common/ApprovalBadge";
import { Modal } from "@/components/common/Modal";
import { Loading } from "@/components/common/Loading";
import { ProductForm, type ProductFormValues } from "@/components/ProductForm";
import { buttonClasses } from "@/components/common/Button";
import { formatCurrency, categoryLabel, matchesProductName, teluguName } from "@/utils/format";
import type { Product } from "@/types";

/** A product as the admin list returns it: any review status, with its shop and submitter. */
type ManagedProduct = Product & { sellerName?: string };

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending Approval" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "missing-te", label: "Add Telugu Name" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

function matchesFilter(p: ManagedProduct, filter: FilterId) {
  if (filter === "all") return true;
  if (filter === "missing-te") return !teluguName(p);
  return (p.approvalStatus ?? "approved") === filter;
}

export default function AdminProducts() {
  const { allCategories } = useCategories();
  const { addProduct, updateProduct, deleteProduct, reload: reloadCatalog } = useProducts();
  const { showToast } = useToast();
  const { sellers, loading: sellersLoading, error: sellersError, reload: reloadSellers } = useSellers();
  const isOwner = useAuth().user?.isOwner === true;
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get("status");
  const filter: FilterId = FILTERS.some((f) => f.id === filterParam) ? (filterParam as FilterId) : "all";
  /** A Category id, set when the admin arrives from the Categories page. */
  const categoryId = searchParams.get("category") ?? "";
  const selectedCategory = allCategories.find((c) => c.id === categoryId);

  const [products, setProducts] = useState<ManagedProduct[]>([]);
  /** The category filter the list was last loaded for; while it differs, the list is loading. */
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const loading = loadedFor !== categoryId;
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const latestLoad = useRef(0);
  const [editTarget, setEditTarget] = useState<ManagedProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedProduct | null>(null);
  const [viewTarget, setViewTarget] = useState<ManagedProduct | null>(null);
  const [approveTarget, setApproveTarget] = useState<ManagedProduct | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ManagedProduct | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newSellerId, setNewSellerId] = useState("");
  const [editSellerId, setEditSellerId] = useState("");

  // The server filters by category id, so the list holds only that category's products.
  const load = useCallback(async () => {
    const request = ++latestLoad.current;
    let data: { products: ManagedProduct[] } | null = null;
    let error: string | null = null;
    try {
      data = await api.get<{ products: ManagedProduct[] }>("/products/manage", categoryId ? { category: categoryId } : undefined);
    } catch (err) {
      error = errorMessage(err);
    }
    // A newer load (e.g. the admin switched category) wins.
    if (request !== latestLoad.current) return;
    if (data) setProducts(data.products);
    setLoadError(error);
    setLoadedFor(categoryId);
  }, [categoryId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Swaps in the server's copy, keeping the shop and submitter the list already knows. */
  function replace(updated: Product) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === updated.id
          ? {
              ...p,
              ...updated,
              submittedBy: p.submittedBy,
              sellerName: sellers.find((seller) => seller.id === updated.sellerId)?.farmName ?? p.sellerName,
            }
          : p
      )
    );
  }

  /** Updates one URL filter, keeping the other. */
  function setParam(key: "status" | "category", value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value && value !== "all") next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true }
    );
  }

  function setFilter(id: FilterId) {
    setParam("status", id);
  }

  const counts = useMemo(() => {
    const c = {} as Record<FilterId, number>;
    for (const f of FILTERS) c[f.id] = products.filter((p) => matchesFilter(p, f.id)).length;
    return c;
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => matchesFilter(p, filter) && matchesProductName(p, search));
  }, [products, filter, search]);

  async function handleEditSubmit(values: ProductFormValues) {
    if (!editTarget) return;
    try {
      const updated = await updateProduct(editTarget.id, {
        ...values,
        ...(editSellerId !== editTarget.sellerId ? { sellerId: editSellerId } : {}),
      });
      replace(updated);
      showToast(
        updated.approvalStatus === "pending" && editTarget.approvalStatus !== "pending"
          ? "Product updated and sent to the site owner for approval. It is hidden from the store until then."
          : "Product updated"
      );
      setEditTarget(null);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  async function handleAddSubmit(values: ProductFormValues) {
    if (!newSellerId) {
      showToast("Choose the seller this product belongs to.", "error");
      return;
    }
    try {
      const created = await addProduct({ ...values, sellerId: newSellerId });
      showToast(
        created.approvalStatus === "pending"
          ? "Product submitted. It will appear in the store once the site owner approves it."
          : "Product added and live in the store."
      );
      setAdding(false);
      setNewSellerId("");
      void load();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      showToast(`${deleteTarget.name} deleted`);
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  /** The list changes only after the server confirms the decision. */
  async function review(target: ManagedProduct, decision: "approve" | "reject") {
    if (reviewing) return;
    setReviewing(true);
    try {
      const { product } = await api.patch<{ product: Product }>(`/products/${target.id}/approval`, {
        decision,
        ...(decision === "reject" ? { reason: rejectReason.trim() } : {}),
      });
      replace(product);
      showToast(decision === "approve" ? `${target.name} approved. It is now live in the store.` : `${target.name} rejected. It stays hidden from customers.`);
      setApproveTarget(null);
      setRejectTarget(null);
      setRejectReason("");
      // The public catalog gains (or keeps out) this product.
      void reloadCatalog();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setReviewing(false);
    }
  }

  const iconButton = "flex h-8 w-8 items-center justify-center rounded-lg text-stone-500";

  return (
    <div>
      {categoryId && (
        <Link
          to="/admin/categories"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800"
        >
          <ArrowLeft size={16} /> Back to Categories
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">
            {categoryId ? `${selectedCategory?.name ?? "Category"} Products` : "All Products"}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {categoryId
              ? `Every product in the ${selectedCategory?.name ?? "selected"} category, whatever its approval status.`
              : "Manage every product listed on the marketplace."}
          </p>
        </div>
        <button onClick={() => setAdding(true)} className={buttonClasses("primary", "md")}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      <p className="mt-4 rounded-xl bg-accent-50 p-3 text-sm text-accent-800">
        {isOwner
          ? "As the site owner you approve products. New products, and content changes to live ones, stay hidden from customers until you approve them."
          : "New products, and changes to a product's name, photos or description, are hidden from customers until the site owner approves them."}
      </p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter products">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === f.id ? "bg-primary-600 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-primary-300"
            }`}
          >
            {f.label} <span className={filter === f.id ? "text-white/80" : "text-stone-400"}>{counts[f.id]}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <SearchBar value={search} onChange={setSearch} className="flex-1" suggestions={false} />
        <select
          value={categoryId || "all"}
          onChange={(e) => setParam("category", e.target.value)}
          aria-label="Filter by category"
          className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-600 outline-none focus:border-primary-400"
        >
          <option value="all">All Categories</option>
          {allCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.isActive === false ? " (hidden)" : ""}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loading label="Loading products..." />
      ) : loadError ? (
        <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Couldn't load products: {loadError}{" "}
          <button onClick={() => void load()} className="font-bold underline">
            Try again
          </button>
        </div>
      ) : (
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
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-stone-400">
                      {filter === "pending" ? "No products are waiting for approval." : "No products match."}
                    </td>
                  </tr>
                )}
                {filtered.map((product) => {
                  const status = product.approvalStatus ?? "approved";
                  return (
                    <tr key={product.id} className="border-t border-stone-100 align-top">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <img src={product.image} alt={product.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                          <div className="min-w-0">
                            <p className="font-semibold text-stone-800">{product.name}</p>
                            {teluguName(product) && (
                              <p lang="te" className="max-w-56 truncate text-xs text-stone-500">{teluguName(product)}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-stone-500">
                        <p>{product.sellerName || "-"}</p>
                        {product.submittedBy && (
                          <p className="text-xs text-stone-400">
                            Added by {product.submittedBy.name}
                            {product.submittedBy.role === "admin" ? " (admin)" : ""}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-stone-500">{categoryLabel(product.category)}</td>
                      <td className="px-5 py-3 font-semibold text-stone-800">{formatCurrency(product.price)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={product.stock > 0 ? "green" : "red"}>{product.stock > 0 ? `${product.stock} in stock` : "Out"}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <ApprovalBadge status={status} />
                        {status === "rejected" && product.rejectionReason && (
                          <p className="mt-1 max-w-48 text-xs text-red-600">{product.rejectionReason}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          {isOwner && status !== "approved" && (
                            <button
                              onClick={() => setApproveTarget(product)}
                              aria-label={`Approve ${product.name}`}
                              title="Approve"
                              className={`${iconButton} hover:bg-primary-50 hover:text-primary-700`}
                            >
                              <Check size={16} />
                            </button>
                          )}
                          {isOwner && status !== "rejected" && (
                            <button
                              onClick={() => setRejectTarget(product)}
                              aria-label={`Reject ${product.name}`}
                              title="Reject"
                              className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
                            >
                              <X size={16} />
                            </button>
                          )}
                          <button onClick={() => setViewTarget(product)} aria-label={`View ${product.name}`} className={`${iconButton} hover:bg-blue-50 hover:text-blue-600`}>
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => {
                              setEditSellerId(product.sellerId);
                              setEditTarget(product);
                            }}
                            aria-label={`Edit ${product.name}`}
                            className={`${iconButton} hover:bg-primary-50 hover:text-primary-700`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => setDeleteTarget(product)} aria-label={`Delete ${product.name}`} className={`${iconButton} hover:bg-red-50 hover:text-red-600`}>
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
      )}

      <Modal isOpen={!!viewTarget} onClose={() => setViewTarget(null)} title={viewTarget?.name}>
        {viewTarget && (
          <div className="space-y-3">
            {teluguName(viewTarget) && (
              <p lang="te" className="text-lg font-semibold text-stone-600">{teluguName(viewTarget)}</p>
            )}
            <img src={viewTarget.image} alt={viewTarget.name} className="h-48 w-full rounded-xl object-cover" />
            <p className="text-sm text-stone-600">{viewTarget.description}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p><span className="text-stone-400">Price:</span> <span className="font-semibold">{formatCurrency(viewTarget.price)}</span></p>
              <p><span className="text-stone-400">Stock:</span> <span className="font-semibold">{viewTarget.stock}</span></p>
              <p><span className="text-stone-400">Rating:</span> <span className="font-semibold">{viewTarget.rating}</span></p>
              <p><span className="text-stone-400">Category:</span> <span className="font-semibold">{categoryLabel(viewTarget.category)}</span></p>
              <p><span className="text-stone-400">Seller:</span> <span className="font-semibold">{viewTarget.sellerName || "-"}</span></p>
              <p><span className="text-stone-400">Added by:</span> <span className="font-semibold">{viewTarget.submittedBy?.name ?? "-"}</span></p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-stone-400">Status:</span> <ApprovalBadge status={viewTarget.approvalStatus} />
            </div>
            {viewTarget.rejectionReason && <p className="text-sm text-red-600">Reason: {viewTarget.rejectionReason}</p>}
          </div>
        )}
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Product">
        {editTarget && (
          <>
            <div className="mb-5">
              <label htmlFor="edit-product-seller" className="mb-1.5 block text-xs font-bold text-stone-600">
                Seller
              </label>
              {sellersLoading ? (
                <p className="text-sm text-stone-500">Loading sellers...</p>
              ) : sellersError ? (
                <div role="alert" className="text-sm text-red-600">
                  Couldn't load sellers: {sellersError}{" "}
                  <button type="button" onClick={() => void reloadSellers()} className="font-bold underline">
                    Try again
                  </button>
                </div>
              ) : (
                <select
                  id="edit-product-seller"
                  value={editSellerId}
                  onChange={(e) => setEditSellerId(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                >
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.farmName}
                    </option>
                  ))}
                </select>
              )}
              {sellers.length === 0 && !sellersLoading && !sellersError && (
                <p className="mt-1 text-xs text-stone-500">No active and approved sellers are available.</p>
              )}
            </div>
            <ProductForm initial={editTarget} onSubmit={handleEditSubmit} submitLabel="Save Changes" canFeature />
          </>
        )}
      </Modal>

      <Modal isOpen={adding} onClose={() => setAdding(false)} title="Add Product">
        <div className="mb-5">
          <label htmlFor="new-product-seller" className="mb-1.5 block text-xs font-bold text-stone-600">
            Seller
          </label>
          <select
            id="new-product-seller"
            required
            value={newSellerId}
            onChange={(e) => setNewSellerId(e.target.value)}
            className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          >
            <option value="" disabled>
              Choose the seller this product belongs to
            </option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.farmName}
              </option>
            ))}
          </select>
          {!isOwner && <p className="mt-1 text-xs text-stone-400">The site owner approves it before customers can see it.</p>}
        </div>
        {adding && <ProductForm onSubmit={handleAddSubmit} submitLabel={isOwner ? "Add Product" : "Submit for Approval"} canFeature />}
      </Modal>

      <Modal isOpen={!!approveTarget} onClose={() => !reviewing && setApproveTarget(null)} title="Approve Product">
        <p className="text-sm text-stone-600">
          Approve "{approveTarget?.name}"? It will appear in the store and customers can buy it.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setApproveTarget(null)} disabled={reviewing} className={buttonClasses("ghost", "sm")}>
            Cancel
          </button>
          <button onClick={() => approveTarget && void review(approveTarget, "approve")} disabled={reviewing} className={buttonClasses("primary", "sm")}>
            {reviewing ? "Approving..." : "Approve"}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!rejectTarget}
        onClose={() => {
          if (reviewing) return;
          setRejectTarget(null);
          setRejectReason("");
        }}
        title="Reject Product"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (rejectTarget) void review(rejectTarget, "reject");
          }}
        >
          <p className="text-sm text-stone-600">
            Reject "{rejectTarget?.name}"? It stays hidden from customers. The seller sees your reason and can edit the product to send it
            again.
          </p>
          <label htmlFor="reject-reason" className="mb-1.5 mt-4 block text-xs font-bold text-stone-600">
            Reason
          </label>
          <textarea
            id="reject-reason"
            required
            minLength={3}
            maxLength={300}
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. The photo is blurry, please upload a clearer one."
            className="w-full resize-none rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
              }}
              disabled={reviewing}
              className={buttonClasses("ghost", "sm")}
            >
              Cancel
            </button>
            <button type="submit" disabled={reviewing || rejectReason.trim().length < 3} className={buttonClasses("danger", "sm")}>
              {reviewing ? "Rejecting..." : "Reject"}
            </button>
          </div>
        </form>
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
