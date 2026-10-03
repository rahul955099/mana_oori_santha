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
  name: string;
  image: string;
  price: number;
  unit: string;
  quantity: number;
}

export interface Order {
  id: string;
  date: string;
  items: OrderItem[];
  total: number;
  /** Discount applied via a coupon code at checkout, if any. */
  discount?: number;
  couponCode?: string;
  status: OrderStatus;
  paymentMethod: "cod" | "online";
  /** Links the order back to the AuthUser who placed it, when logged in at checkout. Absent for legacy/demo orders. */
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
