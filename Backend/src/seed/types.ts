/** Shapes of the sample catalog in ./data — the same shapes the frontend's
 * demo data used, so the original sample files could be ported unchanged. */

export interface SeedCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount: number;
}

export interface SeedSeller {
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
  farmingType?: string;
  experienceYears?: number;
  mainProducts?: string[];
  photos?: string[];
}

export interface SeedProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
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
  priceAvailable?: boolean;
  priceLabel?: string;
}

export interface SeedCoupon {
  code: string;
  type: "percent" | "flat";
  value: number;
  description: string;
  minOrderValue?: number;
  categoryOnly?: string;
  usageLimitPerUser?: number;
}
