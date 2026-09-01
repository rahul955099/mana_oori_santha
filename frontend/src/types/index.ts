export type CategorySlug =
  | "millets"
  | "dry-fruits"
  | "pulses"
  | "seeds"
  | "rice"
  | "oil"
  | "powders"
  | "spices"
  | "traditional-foods";

export interface Category {
  id: string;
  name: string;
  slug: CategorySlug;
  description: string;
  image: string;
  productCount: number;
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

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

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
  status: OrderStatus;
  paymentMethod: "cod" | "online";
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
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  shopName?: string;
  location?: string;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}
