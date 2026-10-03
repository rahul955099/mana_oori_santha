/** Categories are managed by admins in the database, so any slug is possible. */
export type CategorySlug = string;

export interface Category {
  id: string;
  name: string;
  slug: CategorySlug;
  description: string;
  image: string;
  productCount: number;
  sortOrder?: number;
  /** False for categories hidden from the storefront (only admins see these). */
  isActive?: boolean;
}

export type SellerStatus = "pending" | "approved" | "rejected" | "suspended";

export interface PayoutDetails {
  method: "upi" | "bank";
  upiId?: string;
  accountHolder?: string;
  /** Masked (e.g. "••••••9012") except in the admin KYC review. */
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
}

export interface SellerKyc {
  legalName: string;
  /** Masked except in the admin KYC review. */
  pan: string;
  gstin?: string;
  submittedAt: string;
}

/** The seller as they (or an admin) see it: adds onboarding and payout details. */
export interface SellerAccount extends Seller {
  status: SellerStatus;
  statusReason?: string;
  kyc: SellerKyc | null;
  payout: PayoutDetails | null;
}

export interface Seller {
  id: string;
  name: string;
  farmName: string;
  location: string;
  district: string;
  state: string;
  rating: number;
  reviewCount: number;
  productsCount: number;
  joinedYear: number;
  about: string;
  image: string;
  verified: boolean;
  phone: string;
  email: string;
  /** Farming/business type shown on the seller profile, e.g. "Organic Farming". */
  farmingType?: string;
  /** Years of farming/business experience. */
  experienceYears?: number;
  /** Main crops/products grown, shown as chips on the seller profile. */
  mainProducts?: string[];
  /** Shop & farm gallery photos belonging to this specific seller only. */
  photos?: string[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: CategorySlug;
  price: number;
  mrp: number;
  unit: string;
  image: string;
  /** Extra gallery photos shown on the product page. */
  images?: string[];
  sellerId: string;
  rating: number;
  reviewCount: number;
  stock: number;
  description: string;
  benefits: string[];
  isOrganic: boolean;
  isFeatured: boolean;
  createdAt: string;
  /** False when the product has no confirmed price yet (e.g. "Price TBD"). Defaults to true when omitted. */
  priceAvailable?: boolean;
  /** Shown instead of the formatted price when priceAvailable is false, e.g. "Price TBD". */
  priceLabel?: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "packed"
  | "out-for-delivery"
  | "delivered"
  | "cancelled"
  | "return-requested"
  | "returned";

export interface OrderItem {
  productId: string;
  sellerId: string;
  category: string;
  name: string;
  image: string;
  /** Price per unit at the time of purchase. */
  price: number;
  unit: string;
  quantity: number;
}

export type PaymentStatus = "pending" | "paid" | "refunded";

export interface OrderStatusChange {
  status: OrderStatus;
  at: string;
  byRole: UserRole;
  note?: string;
}

export interface Order {
  /** Order number, e.g. "MOS-100001". */
  id: string;
  date: string;
  createdAt: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  /** Discount applied via a coupon code at checkout, if any. */
  discount: number;
  couponCode?: string;
  status: OrderStatus;
  paymentMethod: "cod";
  paymentStatus: PaymentStatus;
  statusHistory: OrderStatusChange[];
  deliveredAt?: string;
  /** Last moment a return can be requested (set once delivered). */
  returnDeadline?: string;
  /** True in a seller's view of a mixed-seller order: other sellers' items are hidden. */
  partial?: boolean;
  /** The buyer's AuthUser.userId (e.g. "MOS-10245"). */
  userId?: string;
  customer: {
    fullName: string;
    mobile: string;
    email: string;
    address: string;
    village: string;
    district: string;
    state: string;
    pincode: string;
  };
}

export type UserRole = "customer" | "seller" | "admin";

export interface AuthUser {
  id: string;
  /** Human-facing, system-generated account ID, e.g. "MOS-10245". Never user-editable. */
  userId: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  /** The seller profile id, for seller accounts. */
  sellerId?: string;
  shopName?: string;
  location?: string;
  profilePhoto?: string;
}

export type AddressType = "home" | "work" | "other";

export interface Address {
  id: string;
  type: AddressType;
  fullName: string;
  phone: string;
  houseNo: string;
  street: string;
  city: string;
  district?: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault: boolean;
}

export type SupportCategory =
  | "order-issue"
  | "delivery-issue"
  | "payment-issue"
  | "product-issue"
  | "return-refund"
  | "farmer-query"
  | "account-issue";

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  "order-issue": "Order Issue",
  "delivery-issue": "Delivery Issue",
  "payment-issue": "Payment Issue",
  "product-issue": "Product Issue",
  "return-refund": "Return / Refund",
  "farmer-query": "Product/Farmer Query",
  "account-issue": "Account/Profile Issue",
};

export type SupportRequestStatus = "open" | "in-progress" | "resolved";

export interface SupportRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: SupportCategory;
  message: string;
  orderId?: string;
  status: SupportRequestStatus;
  createdAt: string;
}

export interface PromoBanner {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  to: string;
  image: string;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

/** The customer's selected delivery location, persisted in localStorage. */
export interface DeliveryLocation {
  /** Short label shown in the navbar, e.g. "Hyderabad, Telangana". */
  label: string;
  city: string;
  state: string;
  area?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  /** How the location was set — lets the UI show "Detected" vs a manual pick. */
  source: "current-location" | "manual";
}

/** A quick-pick / search result entry for the location modal. */
export interface LocationSuggestion {
  id: string;
  city: string;
  state: string;
  area?: string;
  pincode?: string;
  latitude: number;
  longitude: number;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  /** True only when this user has a real order containing this product. Never fabricated. */
  verifiedPurchase: boolean;
}

export type CouponType = "percent" | "flat";

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  description: string;
  active: boolean;
  minOrderValue?: number;
  /** Restrict the discount to items from this category only, e.g. "millets". */
  categoryOnly?: CategorySlug;
  /** Upper limit on a percentage discount, in rupees. */
  maxDiscount?: number;
  /** Orders per customer, e.g. 1 for a first-order coupon. */
  usageLimitPerUser?: number;
  expiresAt?: string;
}

export type NotificationType =
  | "order-placed"
  | "order-status"
  | "support-update"
  | "offer";

export interface AppNotification {
  id: string;
  /** The AuthUser.userId this notification belongs to, or "all" for a broadcast to every customer. */
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  orderId?: string;
}

/** Why a cart line can't be bought right now (from the server's quote). */
export interface CartProblem {
  productId: string;
  name?: string;
  reason: "unavailable" | "out-of-stock" | "insufficient-stock" | "no-price";
  available?: number;
}

/** Server-calculated price breakdown for the cart. */
export interface CartQuote {
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  total: number;
  problems: CartProblem[];
  coupon: { code: string; valid: boolean; message: string; discount: number } | null;
}
