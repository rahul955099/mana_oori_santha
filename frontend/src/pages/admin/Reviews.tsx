import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, Trash2, EyeOff, Eye } from "lucide-react";
import { useProducts } from "@/context/ProductsContext";
import { useToast } from "@/context/ToastContext";
import { SearchBar } from "@/components/common/SearchBar";
import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { Modal } from "@/components/common/Modal";
import { buttonClasses } from "@/components/common/Button";
import { api, errorMessage } from "@/lib/api";
import { formatDate } from "@/utils/format";
import type { Review, ReviewStatus } from "@/types";

export default function AdminReviews() {
  const { reload: reloadProducts } = useProducts();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReviewStatus>("all");
  const [hideTarget, setHideTarget] = useState<Review | null>(null);
  const [note, setNote] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);

  const load = useCallback(async () => {
    try {
      setReviews((await api.get<{ reviews: Review[] }>("/reviews")).reviews);
    } catch (err) {
      showToast(errorMessage(err), "error");
      setReviews([]);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(review: Review, status: ReviewStatus, moderationNote?: string) {
    try {
      const { review: updated } = await api.patch<{ review: Review }>(`/reviews/${review.id}`, { status, note: moderationNote });
      setReviews((prev) => prev?.map((r) => (r.id === updated.id ? updated : r)) ?? prev);
      showToast(status === "hidden" ? "Review hidden from the store" : "Review published");
      void reloadProducts(); // ratings changed
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/reviews/${deleteTarget.id}`);
      setReviews((prev) => prev?.filter((r) => r.id !== deleteTarget.id) ?? prev);
      showToast("Review deleted");
      void reloadProducts();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  if (!reviews) return <Loading label="Loading reviews..." />;

  const term = search.toLowerCase();
  const filtered = reviews.filter(
    (r) =>
      (statusFilter === "all" || r.status === statusFilter) &&
      (r.userName.toLowerCase().includes(term) ||
        (r.productName ?? "").toLowerCase().includes(term) ||
        r.comment.toLowerCase().includes(term))
  );

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Reviews</h1>
      <p className="mt-1 text-sm text-stone-500">
        Reviews from customers who received the product. Hidden reviews don't count towards ratings.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <SearchBar value={search} onChange={setSearch} className="flex-1" placeholder="Search by customer, product or review text..." suggestions={false} />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-600 outline-none focus:border-primary-400"
        >
          <option value="all">All reviews</option>
          <option value="published">Published</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={Star} title="No reviews" description="Customer reviews will appear here as they're submitted." />
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
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((review) => (
                  <tr key={review.id} className="border-t border-stone-100 align-top">
                    <td className="px-5 py-3 font-semibold text-stone-800">
                      {review.productSlug ? (
                        <Link to={`/products/${review.productSlug}`} className="hover:text-primary-700">{review.productName}</Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-stone-600">
                      {review.userName}
                      <p className="text-xs text-stone-400">{formatDate(review.createdAt)}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} size={13} className={i <= review.rating ? "fill-accent-400 text-accent-400" : "fill-stone-200 text-stone-200"} />
                        ))}
                      </div>
                    </td>
                    <td className="max-w-xs px-5 py-3 text-stone-500">
                      <p className="line-clamp-3">{review.comment || "—"}</p>
                      {review.moderationNote && <p className="mt-1 text-[11px] text-stone-400">Hidden: {review.moderationNote}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={review.status === "hidden" ? "gray" : "green"}>{review.status === "hidden" ? "Hidden" : "Published"}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        {review.status === "hidden" ? (
                          <button onClick={() => setStatus(review, "published")} title="Publish" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-primary-50 hover:text-primary-700">
                            <Eye size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setNote("");
                              setHideTarget(review);
                            }}
                            title="Hide from store"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-accent-50 hover:text-accent-700"
                          >
                            <EyeOff size={15} />
                          </button>
                        )}
                        <button onClick={() => setDeleteTarget(review)} title="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-red-50 hover:text-red-600">
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

      <Modal isOpen={!!hideTarget} onClose={() => setHideTarget(null)} title="Hide Review">
        <p className="text-sm text-stone-600">
          The review will be removed from the store and from the product's rating. The customer is told it didn't meet the
          review guidelines.
        </p>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Internal note (optional), e.g. abusive language"
          className="mt-3 w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400"
        />
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setHideTarget(null)} className={buttonClasses("ghost", "sm")}>Cancel</button>
          <button
            onClick={async () => {
              if (hideTarget) await setStatus(hideTarget, "hidden", note.trim() || undefined);
              setHideTarget(null);
            }}
            className={buttonClasses("danger", "sm")}
          >
            Hide Review
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Review">
        <p className="text-sm text-stone-600">Permanently delete this review? Hiding it is usually better, as it can be restored.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className={buttonClasses("ghost", "sm")}>Cancel</button>
          <button onClick={confirmDelete} className={buttonClasses("danger", "sm")}>Delete</button>
        </div>
      </Modal>
    </div>
  );
}
