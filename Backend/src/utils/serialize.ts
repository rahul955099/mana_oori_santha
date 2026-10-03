import type { UserDocument } from "../models/User";
import type { SellerDocument } from "../models/Seller";
import type { ProductDocument } from "../models/Product";
import type { CategoryDocument } from "../models/Category";

/** Shapes returned to clients. They mirror the frontend's types so the UI can
 * use API responses directly, and never include password hashes. */

export function toSafeUser(user: UserDocument, seller?: SellerDocument | null) {
  return {
    id: user._id.toString(),
    userCode: user.userCode,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    address: user.address,
    profileImage: user.profileImage,
    isActive: user.isActive,
    createdAt: user.createdAt,
    ...(seller
      ? { sellerId: seller._id.toString(), shopName: seller.farmName, location: seller.location }
      : {}),
  };
}

export function toCategory(category: CategoryDocument, productCount = 0) {
  return {
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    productCount,
  };
}

/** `user` must be populated with name/email/phone. */
export function toSeller(seller: SellerDocument, productsCount = 0) {
  const user = seller.user as unknown as Pick<UserDocument, "name" | "email" | "phone"> | null;
  return {
    id: seller._id.toString(),
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    farmName: seller.farmName,
    location: seller.location,
    district: seller.district,
    state: seller.state,
    about: seller.about,
    image: seller.image,
    verified: seller.verified,
    farmingType: seller.farmingType,
    experienceYears: seller.experienceYears,
    mainProducts: seller.mainProducts,
    photos: seller.photos,
    rating: seller.rating,
    reviewCount: seller.reviewCount,
    productsCount,
    joinedYear: seller.joinedYear,
  };
}

export function toProduct(product: ProductDocument) {
  return {
    id: product._id.toString(),
    name: product.name,
    slug: product.slug,
    category: product.category,
    price: product.price,
    mrp: product.mrp,
    unit: product.unit,
    image: product.image,
    images: product.images,
    sellerId: product.seller.toString(),
    rating: product.rating,
    reviewCount: product.reviewCount,
    stock: product.stock,
    description: product.description,
    benefits: product.benefits,
    isOrganic: product.isOrganic,
    isFeatured: product.isFeatured,
    priceAvailable: product.priceAvailable,
    priceLabel: product.priceLabel,
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString().slice(0, 10),
  };
}
