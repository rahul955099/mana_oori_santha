import type { Response } from "express";
import { Types, type QueryFilter, type SortOrder } from "mongoose";
import { Product, type ApprovalStatus, type ProductDocument } from "../models/Product";
import { Category } from "../models/Category";
import { Seller } from "../models/Seller";
import { User } from "../models/User";
import { AdminActivity } from "../models/AdminActivity";
import { AppError } from "../utils/AppError";
import { success } from "../utils/response";
import { escapeRegex, slugify } from "../utils/slugify";
import { toProduct } from "../utils/serialize";
import { CAN_MANAGE_PRODUCTS, publicProductFilter, sellableSellerIds } from "../services/sellerAccess.service";
import { notifyUser } from "../services/notification.service";
import type { SellerStatus } from "../models/Seller";
import type { AuthRequest } from "../middleware/auth.middleware";

const SORTS: Record<string, Record<string, SortOrder>> = {
  relevance: { isFeatured: -1, rating: -1, createdAt: -1 },
  newest: { createdAt: -1 },
  "price-low": { price: 1 },
  "price-high": { price: -1 },
  rating: { rating: -1, reviewCount: -1 },
};

const DEFAULT_LIMIT = 24;
/** High enough that the storefront can load the whole (small) catalog in one call. */
const MAX_LIMIT = 500;

/** The Seller profile id of the logged-in seller, or null for other roles. */
async function ownSellerId(req: AuthRequest): Promise<Types.ObjectId | null> {
  return (await ownSeller(req))?._id ?? null;
}

async function ownSeller(req: AuthRequest) {
  if (req.userRole !== "seller") return null;
  return Seller.findOne({ user: req.userId, isActive: true }).select("_id status");
}

/** Throws unless the logged-in seller's account may add or edit products. */
function assertCanManage(seller: { status: SellerStatus } | null) {
  if (!seller) {
    throw new AppError("Seller profile not found", 403, "FORBIDDEN");
  }
  if (!CAN_MANAGE_PRODUCTS.includes(seller.status)) {
    throw new AppError(`Your shop is ${seller.status}, so products can't be changed. Please contact support.`, 403, "SELLER_NOT_ACTIVE");
  }
}

async function uniqueSlug(name: string, excludeId?: Types.ObjectId): Promise<string> {
  const base = slugify(name) || "product";
  let slug = base;
  for (let n = 2; await Product.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); n++) {
    slug = `${base}-${n}`;
  }
  return slug;
}

async function assertCategoryExists(slug: string) {
  if (!(await Category.exists({ slug }))) {
    throw new AppError(`Unknown category "${slug}"`, 400, "VALIDATION_ERROR");
  }
}

function assertPriceNotAboveMrp(price: number, mrp: number) {
  if (price > mrp) {
    throw new AppError("Selling price cannot be higher than MRP", 400, "VALIDATION_ERROR");
  }
}

/** Loads a product the caller may edit: admins can edit any, sellers only their own. */
async function findEditableProduct(req: AuthRequest): Promise<ProductDocument> {
  const product = await Product.findOne({ _id: req.params.id, isActive: true });
  if (!product) {
    throw new AppError("Product not found", 404, "NOT_FOUND");
  }
  if (req.userRole !== "admin") {
    const seller = await ownSeller(req);
    if (!seller || !product.seller.equals(seller._id)) {
      throw new AppError("You can only manage your own products", 403, "FORBIDDEN");
    }
    assertCanManage(seller);
  }
  return product;
}

async function isOwner(req: AuthRequest): Promise<boolean> {
  if (req.userRole !== "admin") return false;
  return !!(await User.exists({ _id: req.userId, isOwner: true }));
}

/** The public catalog: only approved products of approved sellers, for everyone (admins included). */
export async function listProducts(req: AuthRequest, res: Response) {
  const q = req.query as Record<string, string | undefined>;
  const filter: QueryFilter<ProductDocument> = { isActive: true, approvalStatus: "approved" };

  if (q.search) {
    const pattern = new RegExp(escapeRegex(q.search.trim()), "i");
    filter.$or = [{ name: pattern }, { nameTe: pattern }, { category: pattern }, { description: pattern }];
  }
  if (q.category) {
    filter.category = { $in: q.category.split(",").map((c) => c.trim().toLowerCase()) };
  }
  // Only approved sellers' products are on sale.
  const sellable = (await publicProductFilter()).seller.$in;
  if (q.seller) {
    filter.seller = sellable.some((id) => id.equals(q.seller)) ? new Types.ObjectId(q.seller) : { $in: [] };
  } else {
    filter.seller = { $in: sellable };
  }
  if (q.minPrice || q.maxPrice) {
    filter.price = {
      ...(q.minPrice ? { $gte: Number(q.minPrice) } : {}),
      ...(q.maxPrice ? { $lte: Number(q.maxPrice) } : {}),
    };
  }
  if (q.organic === "true") filter.isOrganic = true;
  if (q.featured === "true") filter.isFeatured = true;
  if (q.inStock === "true") filter.stock = { $gt: 0 };

  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(q.limit) || DEFAULT_LIMIT));
  const sort = SORTS[q.sort ?? "relevance"] ?? SORTS.relevance;

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ ...sort, _id: 1 }).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);

  success(res, "Products fetched", {
    products: products.map(toProduct),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
}

/** Accepts either a Mongo id or a slug. Products that aren't approved, or
 * whose seller isn't, are visible only to that seller and admins. */
export async function getProduct(req: AuthRequest, res: Response) {
  const key = String(req.params.idOrSlug);
  const product = await Product.findOne(
    Types.ObjectId.isValid(key) ? { _id: key, isActive: true } : { slug: key.toLowerCase(), isActive: true }
  );
  const visible =
    product &&
    (req.userRole === "admin" ||
      (product.approvalStatus === "approved" &&
        (await publicProductFilter()).seller.$in.some((id) => id.equals(product.seller))) ||
      (await ownSellerId(req))?.equals(product.seller));
  if (!product || !visible) {
    throw new AppError("Product not found", 404, "NOT_FOUND");
  }
  success(res, "Product fetched", { product: toProduct(product) });
}

/** Seller: all of their own listed products, whether or not the shop is approved yet. */
export async function listMyProducts(req: AuthRequest, res: Response) {
  const sellerId = await ownSellerId(req);
  if (!sellerId) {
    throw new AppError("Seller profile not found", 404, "NOT_FOUND");
  }
  const products = await Product.find({ seller: sellerId, isActive: true }).sort({ createdAt: -1 });
  success(res, "Products fetched", { products: products.map(toProduct) });
}

/** Admin: every listed product with its review status, newest first. `?status=pending` narrows it. */
export async function listManagedProducts(req: AuthRequest, res: Response) {
  const status = req.query.status as ApprovalStatus | undefined;
  const filter: QueryFilter<ProductDocument> = { isActive: true, ...(status ? { approvalStatus: status } : {}) };
  // `category` is a Category id; products reference their category by its slug.
  if (req.query.category) {
    const category = await Category.findById(req.query.category).select("slug");
    if (!category) {
      throw new AppError("Category not found", 404, "NOT_FOUND");
    }
    filter.category = category.slug;
  }
  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .populate("submittedBy", "name email role")
    .populate("seller", "farmName");
  success(res, "Products fetched", {
    products: products.map((p) => {
      const by = p.submittedBy as unknown as { name?: string; email?: string; role?: string } | null;
      const shop = p.seller as unknown as { _id: Types.ObjectId; farmName?: string };
      return {
        ...toProduct(p),
        // toProduct reads the seller id; populated, it's the shop document.
        sellerId: shop._id.toString(),
        sellerName: shop.farmName ?? "",
        submittedBy: by?.name ? { name: by.name, email: by.email, role: by.role } : null,
      };
    }),
  });
}

export async function createProduct(req: AuthRequest, res: Response) {
  const b = req.body;
  const byOwner = await isOwner(req);

  let sellerId: Types.ObjectId | null;
  if (req.userRole === "admin") {
    const sellableIds = await sellableSellerIds();
    const seller = sellableIds.some((id) => id.equals(b.sellerId))
      ? await Seller.findOne({ _id: b.sellerId, isActive: true }).select("_id")
      : null;
    if (!seller) {
      throw new AppError("Admins must choose an active seller for the product", 400, "VALIDATION_ERROR");
    }
    sellerId = seller._id;
  } else {
    const seller = await ownSeller(req);
    assertCanManage(seller);
    sellerId = seller!._id;
  }

  await assertCategoryExists(b.category);
  assertPriceNotAboveMrp(b.price, b.mrp);

  const product = await Product.create({
    name: b.name,
    nameTe: b.nameTe ?? "",
    slug: await uniqueSlug(b.name),
    category: b.category,
    price: b.price,
    mrp: b.mrp,
    unit: b.unit,
    image: b.image,
    images: b.images,
    seller: sellerId,
    stock: b.stock,
    description: b.description,
    benefits: b.benefits,
    sizes: cleanSizes(b.sizes),
    isOrganic: b.isOrganic,
    // Homepage placement is a platform decision, so only admins can feature products.
    isFeatured: req.userRole === "admin" ? b.isFeatured : false,
    priceAvailable: b.priceAvailable,
    priceLabel: b.priceLabel,
    // The site owner's own listings need no review; everyone else's wait for it.
    approvalStatus: byOwner ? "approved" : "pending",
    submittedBy: req.userId,
    ...(byOwner ? { reviewedBy: req.userId, reviewedAt: new Date() } : {}),
  });

  if (!byOwner) await notifyOwnerOfSubmission(product.name, "new");
  success(
    res,
    byOwner ? "Product created" : "Product submitted. It will appear in the store once the site owner approves it.",
    { product: toProduct(product) },
    201
  );
}

/** Trims, drops blanks and duplicates (case-insensitive), keeping the seller's order. */
export function cleanSizes(sizes: unknown): string[] {
  if (!Array.isArray(sizes)) return [];
  const seen = new Set<string>();
  return sizes
    .map((s) => String(s).trim())
    .filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
}

async function notifyOwnerOfSubmission(name: string, kind: "new" | "edited") {
  const owner = await User.findOne({ role: "admin", isActive: true, isOwner: true }).select("_id");
  if (!owner) return;
  await notifyUser(owner._id, {
    type: "account",
    title: kind === "new" ? "New product to review" : "Edited product to review",
    message: `"${name}" is waiting for your approval.`,
    link: "/admin/products?status=pending",
  });
}

const EDITABLE_FIELDS = [
  "name",
  "nameTe",
  "category",
  "price",
  "mrp",
  "unit",
  "image",
  "images",
  "stock",
  "description",
  "benefits",
  "sizes",
  "isOrganic",
  "priceAvailable",
  "priceLabel",
] as const;

/** Edits to these fields by anyone but the owner send an approved product back for review. */
const REVIEWED_FIELDS = ["name", "nameTe", "category", "description", "image", "images", "benefits"] as const;

export async function updateProduct(req: AuthRequest, res: Response) {
  const product = await findEditableProduct(req);
  const b = req.body;
  let sellerName: string | undefined;

  if (b.sellerId !== undefined) {
    if (req.userRole !== "admin") {
      throw new AppError("Only admins can change a product's seller", 403, "FORBIDDEN");
    }
    const seller = await Seller.findById(b.sellerId).select("_id isActive status farmName");
    if (!seller) {
      throw new AppError("Seller not found", 400, "INVALID_SELLER");
    }
    if (!seller.isActive || seller.status !== "approved") {
      throw new AppError("Seller must be active and approved", 400, "SELLER_NOT_ACTIVE");
    }
    product.seller = seller._id;
    sellerName = seller.farmName;
  }

  if (b.category !== undefined && b.category !== product.category) {
    await assertCategoryExists(b.category);
  }
  assertPriceNotAboveMrp(b.price ?? product.price, b.mrp ?? product.mrp);

  for (const field of EDITABLE_FIELDS) {
    if (b[field] !== undefined) {
      product.set(field, field === "sizes" ? cleanSizes(b.sizes) : b[field]);
    }
  }
  if (b.isFeatured !== undefined && req.userRole === "admin") {
    product.isFeatured = b.isFeatured;
  }
  if (b.name !== undefined && product.isModified("name")) {
    product.slug = await uniqueSlug(b.name, product._id);
  }

  // Changes to what customers read or see go back for review; price and stock
  // updates don't, so day-to-day selling isn't interrupted. Editing a rejected
  // product resubmits it.
  let resubmitted = false;
  if (!(await isOwner(req))) {
    const contentChanged = REVIEWED_FIELDS.some((f) => product.isModified(f));
    if (product.approvalStatus === "rejected" || (product.approvalStatus === "approved" && contentChanged)) {
      product.approvalStatus = "pending";
      product.rejectionReason = undefined;
      product.reviewedBy = undefined;
      product.reviewedAt = undefined;
      resubmitted = true;
    }
  }
  await product.save();

  if (resubmitted) await notifyOwnerOfSubmission(product.name, "edited");
  success(
    res,
    resubmitted ? "Product updated. It is hidden from the store until the site owner approves the changes." : "Product updated",
    { product: { ...toProduct(product), ...(sellerName ? { sellerName } : {}) } }
  );
}

/** Site owner: approves a product (it goes on sale) or rejects it with a reason (it stays hidden). */
export async function reviewProduct(req: AuthRequest, res: Response) {
  const product = await Product.findOne({ _id: req.params.id, isActive: true });
  if (!product) {
    throw new AppError("Product not found", 404, "NOT_FOUND");
  }
  const approve = req.body.decision === "approve";
  product.approvalStatus = approve ? "approved" : "rejected";
  product.rejectionReason = approve ? undefined : String(req.body.reason).trim();
  product.reviewedBy = new Types.ObjectId(req.userId);
  product.reviewedAt = new Date();
  await product.save();

  const owner = await User.findById(req.userId).select("name email");
  await AdminActivity.create({
    action: approve ? "product.approved" : "product.rejected",
    actorName: owner?.name ?? "The owner",
    actorEmail: owner?.email ?? "",
    targetEmail: approve ? `Product: ${product.name}` : `Product: ${product.name} (${product.rejectionReason})`,
  });
  const seller = await Seller.findById(product.seller).select("user");
  if (seller) {
    await notifyUser(seller.user, {
      type: "account",
      title: approve ? "Product approved" : "Product not approved",
      message: approve
        ? `"${product.name}" is now live in the store.`
        : `"${product.name}" was not approved: ${product.rejectionReason}. Edit it to submit it again.`,
      link: "/seller/products",
    });
  }
  success(res, approve ? "Product approved. It is now live in the store." : "Product rejected. It stays hidden from customers.", {
    product: toProduct(product),
  });
}

/** Soft delete: the product disappears from the store but stays readable for order history. */
export async function deleteProduct(req: AuthRequest, res: Response) {
  const product = await findEditableProduct(req);
  product.isActive = false;
  await product.save();
  success(res, "Product deleted");
}
