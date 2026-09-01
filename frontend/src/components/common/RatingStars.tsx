import { Star } from "lucide-react";

interface RatingStarsProps {
  rating: number;
  reviewCount?: number;
  size?: number;
  showValue?: boolean;
}

export function RatingStars({ rating, reviewCount, size = 14, showValue = true }: RatingStarsProps) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            className={i <= Math.round(rating) ? "fill-accent-400 text-accent-400" : "fill-stone-200 text-stone-200"}
          />
        ))}
      </div>
      {showValue && <span className="text-xs font-semibold text-stone-600">{rating.toFixed(1)}</span>}
      {reviewCount !== undefined && (
        <span className="text-xs text-stone-400">({reviewCount})</span>
      )}
    </div>
  );
}
