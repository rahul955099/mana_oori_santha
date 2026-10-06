import { LayoutDashboard, Package, Store, Users, ShoppingBag, LayoutGrid, BarChart3, LifeBuoy, Star, Tag, Bell, Wallet, ShieldCheck, Truck, HandCoins } from "lucide-react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import type { SidebarLink } from "@/components/layout/DashboardSidebar";

/** Pages only the site owner sees. */
const OWNER_ONLY = new Set(["/admin/payouts", "/admin/team", "/admin/delivery/settlements"]);

const links: SidebarLink[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/customers", label: "Users", icon: Users },
  { to: "/admin/sellers", label: "Farmers/Sellers", icon: Store },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: LayoutGrid },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/delivery/partners", label: "Delivery Partners", icon: Truck },
  { to: "/admin/payouts", label: "Seller Payouts", icon: Wallet },
  { to: "/admin/delivery/settlements", label: "Delivery Settlements", icon: HandCoins },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/coupons", label: "Coupons/Offers", icon: Tag },
  { to: "/admin/support", label: "Customer Support", icon: LifeBuoy },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/team", label: "Admin Team", icon: ShieldCheck },
];

export function AdminLayout() {
  const { user } = useAuth();
  const visible = user?.isOwner ? links : links.filter((l) => !OWNER_ONLY.has(l.to));
  return <DashboardLayout title="Admin Panel" subtitle="Mana Oori Santha" links={visible} />;
}

/** Wraps owner-only admin pages; other admins go back to the dashboard. */
export function OwnerOnly() {
  const { user } = useAuth();
  return user?.isOwner ? <Outlet /> : <Navigate to="/admin/dashboard" replace />;
}
