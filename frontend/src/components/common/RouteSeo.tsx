import { useLocation } from "react-router-dom";
import { Seo } from "@/components/common/Seo";

/** Titles for fixed pages. Product, category and seller pages set their own,
 * using their real names and descriptions. */
const PAGES: Record<string, { title?: string; description?: string; noIndex?: boolean }> = {
  "/": {},
  "/products": { title: "All Products", description: "Shop millets, pulses, rice, cold-pressed oils, flours, dry fruits and dairy from local farmers." },
  "/sellers": { title: "Our Farmers & Sellers", description: "Meet the local farmers and producers behind Mana Oori Santha." },
  "/about": { title: "About Us" },
  "/contact": { title: "Contact Us" },
  "/help": { title: "Help Center" },
  "/login": { title: "Log In", noIndex: true },
  "/register": { title: "Create Account", noIndex: true },
  "/cart": { title: "Your Cart", noIndex: true },
  "/checkout": { title: "Checkout", noIndex: true },
  "/wishlist": { title: "Wishlist", noIndex: true },
  "/my-orders": { title: "My Orders", noIndex: true },
  "/my-support": { title: "Support Requests", noIndex: true },
  "/profile": { title: "My Profile", noIndex: true },
};

const OWN_SEO = /^\/(products|category|sellers)\/[^/]+$/;

export function RouteSeo() {
  const { pathname } = useLocation();
  if (OWN_SEO.test(pathname)) return null;
  const page = PAGES[pathname];
  // Unknown paths are the 404 page or pages with their own tags (e.g. reset password).
  if (!page) return null;
  return <Seo {...page} />;
}
