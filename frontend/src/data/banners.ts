import type { PromoBanner } from "@/types";

// Placeholder banner artwork lives at /assets/banners/*.svg — swap these files
// (keep the same names, or update `image` below) with real photography anytime.
export const banners: PromoBanner[] = [
  {
    id: "banner-fresh-farm",
    title: "Fresh from Local Farmers",
    subtitle: "Farm fresh products at your doorstep.",
    ctaLabel: "Shop Now",
    to: "/products",
    image: "/assets/banners/fresh-farm-products.svg",
  },
  {
    id: "banner-millets",
    title: "Healthy Millets",
    subtitle: "Ragi • Jowar • Bajra & More",
    ctaLabel: "Explore",
    to: "/category/millets",
    image: "/assets/banners/millets-banner.svg",
  },
  {
    id: "banner-dairy",
    title: "Fresh Dairy Products",
    subtitle: "Pure • Fresh • Local",
    ctaLabel: "Shop Dairy",
    to: "/category/dairy",
    image: "/assets/banners/dairy-banner.svg",
  },
  {
    id: "banner-flours",
    title: "Natural Flours",
    subtitle: "Freshly made from quality grains.",
    ctaLabel: "Explore Flours",
    to: "/category/flours",
    image: "/assets/banners/flours-banner.svg",
  },
  {
    id: "banner-local-farmers",
    title: "Support Local Farmers",
    subtitle: "Buy local. Eat fresh.",
    ctaLabel: "Shop Now",
    to: "/sellers",
    image: "/assets/banners/local-farmers.svg",
  },
];
