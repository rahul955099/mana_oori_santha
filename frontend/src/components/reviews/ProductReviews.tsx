import { useState } from "react";
import { Link } from "react-router-dom";
import { Star, BadgeCheck, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useOrders } from "@/context/OrdersContext";
import { useReviews } from "@/context/ReviewsContext";
import { useToast } from "@/context/ToastContext";
import { formatDate } from "@/utils/format";

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

export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const { orders } = useOrders();
  const { getReviewsForProduct, getAverageRating, getUserReviewForProduct, submitReview, deleteReview } = useReviews();
  const { showToast } = useToast();

  const reviews = getReviewsForProduct(productId);
  const { average, count } = getAverageRating(productId);
  const myReview = user ? getUserReviewForProduct(productId, user.userId) : undefined;
  const hasPurchased = user
    ? orders.some(
        (o) =>
          o.userId === user.userId &&
          o.status !== "cancelled" &&
          o.status !== "returned" &&
          o.items.some((i) => i.productId === productId),
      )
    : false;

  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [comment, setComment] = useState(myReview?.comment ?? "");

  function openForm() {
    setRating(myReview?.rating ?? 0);
    setComment(myReview?.comment ?? "");
    setFormOpen(true);
  }

  function handleSubmit() {
    if (!user || rating === 0) return;
    submitReview({
      productId,
      userId: user.userId,
      userName: user.name,
      rating,
      comment: comment.trim(),
      verifiedPurchase: hasPurchased,
    });
    setFormOpen(false);
    showToast(myReview ? "Review updated." : "Thanks for your review!");
  }

  function handleDelete() {
    if (!user || !myReview) return;
    deleteReview(myReview.id, user.userId);
    setFormOpen(false);
    showToast("Review deleted.");
  }

  return (
    <div className="mt-16">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-900">Customer Reviews</h2>
          {count > 0 ? (
            <div className="mt-1 flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={16} className={i <= Math.round(average) ? "fill-accent-400 text-accent-400" : "fill-stone-200 text-stone-200"} />
                ))}
              </div>
              <span className="text-sm font-bold text-stone-800">{average.toFixed(1)}</span>
              <span className="text-sm text-stone-400">({count} review{count !== 1 ? "s" : ""})</span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-stone-400">No reviews yet — be the first to review this product.</p>
          )}
        </div>

        {user ? (
          !formOpen && (
            <button
              onClick={openForm}
              className="rounded-full border border-primary-600 px-4 py-2 text-sm font-bold text-primary-700 hover:bg-primary-50"
            >
              {myReview ? "Edit Your Review" : "Write a Review"}
            </button>
          )
        ) : (
          <Link to="/login" className="rounded-full border border-primary-600 px-4 py-2 text-sm font-bold text-primary-700 hover:bg-primary-50">
            Log in to write a review
          </Link>
        )}
      </div>

      {formOpen && (
        <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Your Rating</p>
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this product..."
            className="mt-3 w-full resize-none rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={rating === 0}
              className="rounded-full bg-primary-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {myReview ? "Save Changes" : "Submit Review"}
            </button>
            <button onClick={() => setFormOpen(false)} className="text-sm font-semibold text-stone-500 hover:underline">
              Cancel
            </button>
            {myReview && (
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
                  {user?.userId === review.userId && (
                    <button onClick={openForm} className="text-stone-400 hover:text-primary-600" aria-label="Edit your review">
                      <Pencil size={13} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-stone-400">{formatDate(review.createdAt.slice(0, 10))}</p>
              </div>
              <div className="mt-1.5 flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={13} className={i <= review.rating ? "fill-accent-400 text-accent-400" : "fill-stone-200 text-stone-200"} />
                ))}
              </div>
              {review.comment && <p className="mt-2 text-sm leading-relaxed text-stone-600">{review.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
