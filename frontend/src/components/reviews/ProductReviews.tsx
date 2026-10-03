import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, BadgeCheck, Trash2, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useProducts } from "@/context/ProductsContext";
import { api, errorMessage } from "@/lib/api";
import { formatDate } from "@/utils/format";
import type { Review } from "@/types";

interface ReviewsResponse {
  reviews: Review[];
  mine: Review | null;
  canReview: boolean;
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} aria-label={`${i} star`}>
          <Star size={22} className={i <= value ? "fill-accent-400 text-accent-400" : "fill-stone-200 text-stone-200"} />
        </button>
      ))}
    </div>
  );
}

function Stars({ rating, size }: { rating: number; size: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(rating) ? "fill-accent-400 text-accent-400" : "fill-stone-200 text-stone-200"} />
      ))}
    </div>
  );
}

/** Reviews for one product. Only customers whose order of it was delivered can write one. */
export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { reload: reloadProducts } = useProducts();
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.get<ReviewsResponse>(`/products/${productId}/reviews`));
    } catch {
      setData({ reviews: [], mine: null, canReview: false });
    }
  }, [productId]);

  useEffect(() => {
    void load();
    // Reload when the user logs in or out: "mine" and "canReview" depend on it.
  }, [load, user?.id]);

  const reviews = data?.reviews ?? [];
  const mine = data?.mine ?? null;
  const count = reviews.length;
  const average = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;

  function openForm() {
    setRating(mine?.rating ?? 0);
    setComment(mine?.comment ?? "");
    setFormOpen(true);
  }

  async function handleSubmit() {
    if (rating === 0) return;
    setSaving(true);
    try {
      await api.put(`/products/${productId}/reviews/mine`, { rating, comment: comment.trim() });
      showToast(mine ? "Review updated." : "Thanks for your review!");
      setFormOpen(false);
      await Promise.all([load(), reloadProducts()]); // product rating changed
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/products/${productId}/reviews/mine`);
      showToast("Review deleted.");
      setFormOpen(false);
      await Promise.all([load(), reloadProducts()]);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  return (
    <div className="mt-16">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-900">Customer Reviews</h2>
          {count > 0 ? (
            <div className="mt-1 flex items-center gap-2">
              <Stars rating={average} size={16} />
              <span className="text-sm font-bold text-stone-800">{average.toFixed(1)}</span>
              <span className="text-sm text-stone-400">({count} review{count !== 1 ? "s" : ""})</span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-stone-400">No reviews yet.</p>
          )}
        </div>

        {!user ? (
          <Link to="/login" className="rounded-full border border-primary-600 px-4 py-2 text-sm font-bold text-primary-700 hover:bg-primary-50">
            Log in to write a review
          </Link>
        ) : data?.canReview ? (
          !formOpen && (
            <button
              onClick={openForm}
              className="rounded-full border border-primary-600 px-4 py-2 text-sm font-bold text-primary-700 hover:bg-primary-50"
            >
              {mine ? "Edit Your Review" : "Write a Review"}
            </button>
          )
        ) : (
          data && <p className="text-xs text-stone-400">You can review this product after it's delivered to you.</p>
        )}
      </div>

      {mine?.status === "hidden" && !formOpen && (
        <p className="mb-6 flex items-center gap-2 rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-600">
          <EyeOff size={16} /> Your review isn't shown publicly because it didn't meet our review guidelines.
        </p>
      )}

      {formOpen && (
        <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Your Rating</p>
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            rows={3}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this product..."
            className="mt-3 w-full resize-none rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || saving}
              className="rounded-full bg-primary-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {mine ? "Save Changes" : "Submit Review"}
            </button>
            <button onClick={() => setFormOpen(false)} className="text-sm font-semibold text-stone-500 hover:underline">
              Cancel
            </button>
            {mine && (
              <button onClick={handleDelete} className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:underline">
                <Trash2 size={14} /> Delete Review
              </button>
            )}
          </div>
        </div>
      )}

      {reviews.length > 0 && (
        <div className="space-y-5">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-stone-800">{review.userName}</p>
                  {review.verifiedPurchase && (
                    <span className="flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-700">
                      <BadgeCheck size={11} /> Verified Purchase
                    </span>
                  )}
                  {mine?.id === review.id && <span className="text-[11px] font-semibold text-stone-400">(you)</span>}
                </div>
                <p className="text-xs text-stone-400">{formatDate(review.createdAt)}</p>
              </div>
              <div className="mt-1.5">
                <Stars rating={review.rating} size={13} />
              </div>
              {review.comment && <p className="mt-2 text-sm leading-relaxed text-stone-600">{review.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
