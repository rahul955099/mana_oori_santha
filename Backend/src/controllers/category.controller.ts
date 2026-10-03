import type { Request, Response } from "express";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { AppError } from "../utils/AppError";
import { success } from "../utils/response";
import { slugify } from "../utils/slugify";
import { toCategory } from "../utils/serialize";
import { sellableSellerIds } from "../services/sellerAccess.service";
import type { AuthRequest } from "../middleware/auth.middleware";

async function productCountsBySlug(): Promise<Map<string, number>> {
  const rows = await Product.aggregate<{ _id: string; count: number }>([
    // Count only products customers can actually see.
    { $match: { isActive: true, seller: { $in: await sellableSellerIds() } } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.count]));
}

/** Public list shows active categories only; `?all=true` (admin only) includes inactive ones. */
export async function listCategories(req: AuthRequest, res: Response) {
  const includeInactive = req.query.all === "true" && req.userRole === "admin";
  const [categories, counts] = await Promise.all([
    Category.find(includeInactive ? {} : { isActive: true }).sort({ sortOrder: 1, name: 1 }),
    productCountsBySlug(),
  ]);
  success(res, "Categories fetched", {
    categories: categories.map((c) => toCategory(c, counts.get(c.slug) ?? 0)),
  });
}

export async function getCategory(req: Request, res: Response) {
  const category = await Category.findOne({ slug: req.params.slug, isActive: true });
  if (!category) {
    throw new AppError("Category not found", 404, "NOT_FOUND");
  }
  const count = await Product.countDocuments({
    category: category.slug,
    isActive: true,
    seller: { $in: await sellableSellerIds() },
  });
  success(res, "Category fetched", { category: toCategory(category, count) });
}

export async function createCategory(req: Request, res: Response) {
  const { name, description, image, sortOrder, isActive } = req.body;
  const slug = req.body.slug ? slugify(req.body.slug) : slugify(name);
  if (await Category.exists({ slug })) {
    throw new AppError("A category with this slug already exists", 409, "DUPLICATE_SLUG");
  }
  const category = await Category.create({ name, slug, description, image, sortOrder, isActive });
  success(res, "Category created", { category: toCategory(category) }, 201);
}

/** The slug is deliberately not editable: products reference categories by slug. */
export async function updateCategory(req: Request, res: Response) {
  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new AppError("Category not found", 404, "NOT_FOUND");
  }
  const { name, description, image, sortOrder, isActive } = req.body;
  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (image !== undefined) category.image = image;
  if (sortOrder !== undefined) category.sortOrder = sortOrder;
  if (isActive !== undefined) category.isActive = isActive;
  await category.save();

  const count = await Product.countDocuments({ category: category.slug, isActive: true });
  success(res, "Category updated", { category: toCategory(category, count) });
}

export async function deleteCategory(req: Request, res: Response) {
  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new AppError("Category not found", 404, "NOT_FOUND");
  }
  const inUse = await Product.countDocuments({ category: category.slug, isActive: true });
  if (inUse > 0) {
    throw new AppError(
      `This category still has ${inUse} product(s). Move or delete them first, or mark the category inactive.`,
      409,
      "CATEGORY_IN_USE"
    );
  }
  await category.deleteOne();
  success(res, "Category deleted");
}
