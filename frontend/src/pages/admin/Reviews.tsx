import { useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { useReviews } from "@/context/ReviewsContext";
import { useProducts } from "@/context/ProductsContext";
import { SearchBar } from "@/components/common/SearchBar";
import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal } from "@/components/common/Modal";
import { buttonClasses } from "@/components/common/Button";
import { formatDate } from "@/utils/format";
import type { Review } from "@/types";

export default function AdminReviews() {
  const { reviews, deleteReview } = useReviews();
  const { getProductById } = useProducts();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);

  const filtered = reviews.filter((r) => {
    const product = getProductById(r.productId);
    return (
      r.userName.toLowerCase().includes(search.toLowerCase()) ||
      (product?.name.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      r.comment.toLowerCase().includes(search.toLowerCase())
    );
  });

  function confirmDelete() {
    if (deleteTarget) {
      deleteReview(deleteTarget.id, deleteTarget.userId);
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Reviews</h1>
      <p className="mt-1 text-sm text-stone-500">Customer reviews and ratings submitted across all products.</p>

      <SearchBar value={search} onChange={setSearch} className="mt-6 max-w-md" placeholder="Search by customer, product or review text..." suggestions={false} />

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={Star} title="No reviews yet" description="Customer reviews will appear here as they're submitted." />
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50">
                <tr className="text-xs font-bold uppercase text-stone-400">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Rating</th>
                  <th className="px-5 py-3">Review</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((review) => {
                  const product = getProductById(review.productId);
                  return (
                    <tr key={review.id} className="border-t border-stone-100 align-top">
                      <td className="px-5 py-3 font-semibold text-stone-800">{product?.name ?? "—"}</td>
                      <td className="px-5 py-3 text-stone-600">
                        {review.userName}
                        {review.verifiedPurchase && (
                          <div className="mt-1"><Badge tone="green">Verified Purchase</Badge></div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} size={13} className={i <= review.rating ? "fill-accent-400 text-accent-400" : "fill-stone-200 text-stone-200"} />
                          ))}
                        </div>
                      </td>
                      <td className="max-w-xs px-5 py-3 text-stone-500">
                        <p className="line-clamp-2">{review.comment || "—"}</p>
                      </td>
                      <td className="px-5 py-3 text-stone-500">{formatDate(review.createdAt.slice(0, 10))}</td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => setDeleteTarget(review)} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-red-50 hover:text-red-600">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Review">
        <p className="text-sm text-stone-600">Are you sure you want to remove this review? This action cannot be undone.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className={buttonClasses("ghost", "sm")}>Cancel</button>
          <button onClick={confirmDelete} className={buttonClasses("danger", "sm")}>Delete</button>
        </div>
      </Modal>
    </div>
  );
}
