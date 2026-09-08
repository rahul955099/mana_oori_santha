import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Review } from "@/types";

interface ReviewsContextValue {
  reviews: Review[];
  submitReview: (input: {
    productId: string;
    userId: string;
    userName: string;
    rating: number;
    comment: string;
    verifiedPurchase: boolean;
  }) => void;
  deleteReview: (id: string, userId: string) => void;
  getReviewsForProduct: (productId: string) => Review[];
  getAverageRating: (productId: string) => { average: number; count: number };
  getUserReviewForProduct: (productId: string, userId: string) => Review | undefined;
}

const ReviewsContext = createContext<ReviewsContextValue | undefined>(undefined);
const STORAGE_KEY = "mos_reviews";

export function ReviewsProvider({ children }: { children: ReactNode }) {
  const [reviews, setReviews] = useState<Review[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Review[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  }, [reviews]);

  function submitReview(input: {
    productId: string;
    userId: string;
    userName: string;
    rating: number;
    comment: string;
    verifiedPurchase: boolean;
  }) {
    setReviews((prev) => {
      const existingIndex = prev.findIndex((r) => r.productId === input.productId && r.userId === input.userId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          rating: input.rating,
          comment: input.comment,
          verifiedPurchase: input.verifiedPurchase,
          createdAt: new Date().toISOString(),
        };
        return updated;
      }
      const newReview: Review = {
        ...input,
        id: `REV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date().toISOString(),
      };
      return [newReview, ...prev];
    });
  }

  function deleteReview(id: string, userId: string) {
    setReviews((prev) => prev.filter((r) => !(r.id === id && r.userId === userId)));
  }

  function getReviewsForProduct(productId: string) {
    return reviews
      .filter((r) => r.productId === productId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  function getAverageRating(productId: string) {
    const productReviews = reviews.filter((r) => r.productId === productId);
    if (productReviews.length === 0) return { average: 0, count: 0 };
    const sum = productReviews.reduce((s, r) => s + r.rating, 0);
    return { average: sum / productReviews.length, count: productReviews.length };
  }

  function getUserReviewForProduct(productId: string, userId: string) {
    return reviews.find((r) => r.productId === productId && r.userId === userId);
  }

  return (
    <ReviewsContext.Provider
      value={{ reviews, submitReview, deleteReview, getReviewsForProduct, getAverageRating, getUserReviewForProduct }}
    >
      {children}
    </ReviewsContext.Provider>
  );
}

export function useReviews(): ReviewsContextValue {
  const ctx = useContext(ReviewsContext);
  if (!ctx) throw new Error("useReviews must be used within ReviewsProvider");
  return ctx;
}
