import type { Response } from "express";
import { Types, type QueryFilter, type SortOrder } from "mongoose";
import { Product, type ProductDocument } from "../models/Product";
import { Category } from "../models/Category";
import { Seller } from "../models/Seller";
import { AppError } from "../utils/AppError";
import { success } from "../utils/response";
import { escapeRegex, slugify } from "../utils/slugify";
import { toProduct } from "../utils/serialize";
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
  if (req.userRole !== "seller") return null;
  const seller = await Seller.findOne({ user: req.userId, isActive: true }).select("_id");
  return seller?._id ?? null;
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
    const sellerId = await ownSellerId(req);
    if (!sellerId || !product.seller.equals(sellerId)) {
      throw new AppError("You can only manage your own products", 403, "FORBIDDEN");
    }
  }
  return product;
}

export async function listProducts(req: AuthRequest, res: Response) {
  const q = req.query as Record<string, string | undefined>;
  const filter: QueryFilter<ProductDocument> = { isActive: true };

  if (q.search) {
    const pattern = new RegExp(escapeRegex(q.search.trim()), "i");
    filter.$or = [{ name: pattern }, { category: pattern }, { description: pattern }];
  }
  if (q.category) {
    filter.category = { $in: q.category.split(",").map((c) => c.trim().toLowerCase()) };
  }
  if (q.seller) {
    filter.seller = new Types.ObjectId(q.seller);
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

/** Accepts either a Mongo id or a slug. */
export async function getProduct(req: AuthRequest, res: Response) {
  const key = String(req.params.idOrSlug);
  const product = await Product.findOne(
    Types.ObjectId.isValid(key) ? { _id: key, isActive: true } : { slug: key.toLowerCase(), isActive: true }
  );
  if (!product) {
    throw new AppError("Product not found", 404, "NOT_FOUND");
  }
  success(res, "Product fetched", { product: toProduct(product) });
}

export async function createProduct(req: AuthRequest, res: Response) {
  const b = req.body;

  let sellerId: Types.ObjectId | null;
  if (req.userRole === "admin") {
    const seller = await Seller.findOne({ _id: b.sellerId, isActive: true }).select("_id");
    if (!seller) {
      throw new AppError("Admins must choose an active seller for the product", 400, "VALIDATION_ERROR");
    }
    sellerId = seller._id;
  } else {
    sellerId = await ownSellerId(req);
    if (!sellerId) {
      throw new AppError("Seller profile not found", 403, "FORBIDDEN");
    }
  }

  await assertCategoryExists(b.category);
  assertPriceNotAboveMrp(b.price, b.mrp);

  const product = await Product.create({
    name: b.name,
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
    isOrganic: b.isOrganic,
    // Homepage placement is a platform decision, so only admins can feature products.
    isFeatured: req.userRole === "admin" ? b.isFeatured : false,
    priceAvailable: b.priceAvailable,
    priceLabel: b.priceLabel,
  });

  success(res, "Product created", { product: toProduct(product) }, 201);
}

const EDITABLE_FIELDS = [
  "name",
  "category",
  "price",
  "mrp",
  "unit",
  "image",
  "images",
  "stock",
  "description",
  "benefits",
  "isOrganic",
  "priceAvailable",
  "priceLabel",
] as const;

export async function updateProduct(req: AuthRequest, res: Response) {
  const product = await findEditableProduct(req);
  const b = req.body;

  if (b.category !== undefined && b.category !== product.category) {
    await assertCategoryExists(b.category);
  }
  assertPriceNotAboveMrp(b.price ?? product.price, b.mrp ?? product.mrp);

  for (const field of EDITABLE_FIELDS) {
    if (b[field] !== undefined) {
      product.set(field, b[field]);
    }
  }
  if (b.isFeatured !== undefined && req.userRole === "admin") {
    product.isFeatured = b.isFeatured;
  }
  if (b.name !== undefined && product.isModified("name")) {
    product.slug = await uniqueSlug(b.name, product._id);
  }
  await product.save();

  success(res, "Product updated", { product: toProduct(product) });
}

/** Soft delete: the product disappears from the store but stays readable for order history. */
export async function deleteProduct(req: AuthRequest, res: Response) {
  const product = await findEditableProduct(req);
  product.isActive = false;
  await product.save();
  success(res, "Product deleted");
}
