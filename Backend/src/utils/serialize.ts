import type { Types } from "mongoose";
import type { SavedAddress, UserDocument } from "../models/User";
import type { OrderDocument } from "../models/Order";
import type { CouponDocument } from "../models/Coupon";
import { deliveryRules } from "../config/delivery";
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
    emailVerified: user.emailVerified,
    notificationPrefs: {
      orderUpdates: user.notificationPrefs?.orderUpdates ?? true,
      deliveryAlerts: user.notificationPrefs?.deliveryAlerts ?? true,
      promotions: user.notificationPrefs?.promotions ?? false,
    },
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

/** Shows only the last few characters of a sensitive value, e.g. "••••••3456". */
export function mask(value: string | undefined, visible = 4): string | undefined {
  if (!value) return value;
  return value.length <= visible ? value : `${"•".repeat(Math.min(6, value.length - visible))}${value.slice(-visible)}`;
}

/** The seller as the seller themselves or an admin sees it: adds onboarding
 * status, KYC and payout details. `full` (admins reviewing KYC) skips masking. */
export function toSellerPrivate(seller: SellerDocument, productsCount = 0, options: { full?: boolean } = {}) {
  const m = (v: string | undefined) => (options.full ? v : mask(v));
  return {
    ...toSeller(seller, productsCount),
    status: seller.status,
    statusReason: seller.statusReason,
    kyc: seller.kyc
      ? { legalName: seller.kyc.legalName, pan: m(seller.kyc.pan), gstin: seller.kyc.gstin, submittedAt: seller.kyc.submittedAt }
      : null,
    payout: seller.payout
      ? {
          method: seller.payout.method,
          upiId: seller.payout.upiId,
          accountHolder: seller.payout.accountHolder,
          accountNumber: m(seller.payout.accountNumber),
          ifsc: seller.payout.ifsc,
          bankName: seller.payout.bankName,
        }
      : null,
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

/** `order.user` may be populated with userCode; sellers pass their own
 * seller id so they only see their items of a mixed-seller order. */
export function toOrder(order: OrderDocument, options: { onlySellerId?: Types.ObjectId } = {}) {
  const user = order.user as unknown as { _id?: Types.ObjectId; userCode?: string };
  const items = options.onlySellerId
    ? order.items.filter((i) => i.seller.equals(options.onlySellerId!))
    : order.items;
  const returnDeadline = order.deliveredAt
    ? new Date(order.deliveredAt.getTime() + deliveryRules.returnWindowDays * 24 * 60 * 60 * 1000)
    : undefined;
  return {
    id: order.orderNumber,
    date: order.createdAt.toISOString().slice(0, 10),
    createdAt: order.createdAt,
    items: items.map((i) => ({
      productId: i.product.toString(),
      sellerId: i.seller.toString(),
      name: i.name,
      image: i.image,
      unit: i.unit,
      category: i.category,
      price: i.price,
      quantity: i.quantity,
    })),
    subtotal: order.subtotal,
    discount: order.discount,
    deliveryCharge: order.deliveryCharge,
    total: order.total,
    couponCode: order.couponCode,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    userId: user?.userCode,
    customer: order.shippingAddress,
    statusHistory: order.statusHistory.map((h) => ({ status: h.status, at: h.at, byRole: h.byRole, note: h.note })),
    deliveredAt: order.deliveredAt,
    returnDeadline,
    /** True when the seller view hides other sellers' items. */
    partial: items.length !== order.items.length,
  };
}

export function toCoupon(coupon: CouponDocument) {
  return {
    id: coupon._id.toString(),
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    description: coupon.description,
    active: coupon.active,
    minOrderValue: coupon.minOrderValue,
    maxDiscount: coupon.maxDiscount,
    categoryOnly: coupon.categoryOnly,
    usageLimitPerUser: coupon.usageLimitPerUser,
    expiresAt: coupon.expiresAt,
  };
}

export function toAddress(a: SavedAddress) {
  return {
    id: a._id.toString(),
    type: a.type,
    fullName: a.fullName,
    phone: a.phone,
    houseNo: a.houseNo,
    street: a.street,
    city: a.city,
    district: a.district,
    state: a.state,
    pincode: a.pincode,
    landmark: a.landmark,
    isDefault: a.isDefault,
  };
}
