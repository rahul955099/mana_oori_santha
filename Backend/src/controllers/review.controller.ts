import type { Response } from "express";
import { Types, type QueryFilter } from "mongoose";
import { Review, type ReviewDocument } from "../models/Review";
import { Product } from "../models/Product";
import { Order } from "../models/Order";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { success } from "../utils/response";
import { escapeRegex } from "../utils/slugify";
import { refreshRatings } from "../services/rating.service";
import type { AuthRequest } from "../middleware/auth.middleware";

function toReview(r: ReviewDocument, options: { admin?: boolean } = {}) {
  const product = r.product as unknown as { _id?: Types.ObjectId; name?: string; slug?: string };
  return {
    id: r._id.toString(),
    productId: (product._id ?? r.product).toString(),
    ...(options.admin ? { productName: product.name, productSlug: product.slug } : {}),
    userName: r.userName,
    rating: r.rating,
    comment: r.comment,
    verifiedPurchase: r.verifiedPurchase,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    ...(options.admin ? { status: r.status, moderationNote: r.moderationNote } : {}),
  };
}

async function findProduct(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new AppError("Product not found", 404, "NOT_FOUND");
  const product = await Product.findOne({ _id: id, isActive: true }).select("_id seller");
  if (!product) throw new AppError("Product not found", 404, "NOT_FOUND");
  return product;
}

/** Only customers who have received the product may review it. */
async function hasReceived(userId: string, productId: Types.ObjectId) {
  return !!(await Order.exists({ user: userId, status: "delivered", "items.product": productId }));
}

/** Public list of published reviews. Logged-in callers also get their own
 * review (even if hidden) and whether they're allowed to write one. */
export async function listProductReviews(req: AuthRequest, res: Response) {
  const product = await findProduct(String(req.params.id));
  const reviews = await Review.find({ product: product._id, status: "published" }).sort({ createdAt: -1 }).limit(200);

  let mine = null;
  let canReview = false;
  if (req.userId) {
    const own = await Review.findOne({ product: product._id, user: req.userId });
    mine = own ? { ...toReview(own), status: own.status } : null;
    canReview = !!own || (await hasReceived(req.userId, product._id));
  }
  success(res, "Reviews fetched", { reviews: reviews.map((r) => toReview(r)), mine, canReview });
}

export async function upsertMyReview(req: AuthRequest, res: Response) {
  const product = await findProduct(String(req.params.id));
  const existing = await Review.findOne({ product: product._id, user: req.userId });
  if (!existing && !(await hasReceived(req.userId!, product._id))) {
    throw new AppError("You can review this product once your order has been delivered.", 403, "NOT_PURCHASED");
  }

  const user = await User.findById(req.userId).select("name");
  const review =
    existing ??
    new Review({ product: product._id, seller: product.seller, user: req.userId, verifiedPurchase: true });
  review.rating = req.body.rating;
  review.comment = req.body.comment ?? "";
  review.userName = user?.name ?? "Customer";
  // Editing doesn't un-hide a review an admin has hidden.
  await review.save();
  await refreshRatings(product._id, product.seller);

  success(res, existing ? "Review updated" : "Thanks for your review!", { review: { ...toReview(review), status: review.status } }, existing ? 200 : 201);
}

export async function deleteMyReview(req: AuthRequest, res: Response) {
  const product = await findProduct(String(req.params.id));
  const review = await Review.findOneAndDelete({ product: product._id, user: req.userId });
  if (!review) throw new AppError("Review not found", 404, "NOT_FOUND");
  await refreshRatings(product._id, product.seller);
  success(res, "Review deleted");
}

/** The customer's own reviews across all products (shown on their profile). */
export async function listMyReviews(req: AuthRequest, res: Response) {
  const reviews = await Review.find({ user: req.userId }).sort({ updatedAt: -1 }).populate("product", "name slug");
  success(res, "Reviews fetched", {
    reviews: reviews.map((r) => ({ ...toReview(r, { admin: true }), moderationNote: undefined })),
  });
}

/** Admin: every review, newest first, filterable by status and searchable. */
export async function adminListReviews(req: AuthRequest, res: Response) {
  const { status, search, rating } = req.query as Record<string, string | undefined>;
  const filter: QueryFilter<ReviewDocument> = {};
  if (status) filter.status = status as ReviewDocument["status"];
  if (rating) filter.rating = Number(rating);
  if (search) {
    const pattern = new RegExp(escapeRegex(search.trim()), "i");
    const products = await Product.find({ name: pattern }).select("_id");
    filter.$or = [{ userName: pattern }, { comment: pattern }, { product: { $in: products.map((p) => p._id) } }];
  }
  const reviews = await Review.find(filter).sort({ createdAt: -1 }).limit(500).populate("product", "name slug");
  success(res, "Reviews fetched", { reviews: reviews.map((r) => toReview(r, { admin: true })) });
}

export async function adminModerateReview(req: AuthRequest, res: Response) {
  const review = await Review.findById(req.params.reviewId);
  if (!review) throw new AppError("Review not found", 404, "NOT_FOUND");
  review.status = req.body.status;
  review.moderationNote = req.body.status === "hidden" ? req.body.note : undefined;
  await review.save();
  await refreshRatings(review.product, review.seller);
  await review.populate("product", "name slug");
  success(res, req.body.status === "hidden" ? "Review hidden" : "Review published", {
    review: toReview(review, { admin: true }),
  });
}

export async function adminDeleteReview(req: AuthRequest, res: Response) {
  const review = await Review.findByIdAndDelete(req.params.reviewId);
  if (!review) throw new AppError("Review not found", 404, "NOT_FOUND");
  await refreshRatings(review.product, review.seller);
  success(res, "Review deleted");
}
