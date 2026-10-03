import { LayoutDashboard, Package, Store, Users, ShoppingBag, LayoutGrid, BarChart3, LifeBuoy, Star, Tag, Bell, Wallet } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import type { SidebarLink } from "@/components/layout/DashboardSidebar";

const links: SidebarLink[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/customers", label: "Users", icon: Users },
  { to: "/admin/sellers", label: "Farmers/Sellers", icon: Store },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: LayoutGrid },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/payouts", label: "Seller Payouts", icon: Wallet },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/coupons", label: "Coupons/Offers", icon: Tag },
  { to: "/admin/support", label: "Customer Support", icon: LifeBuoy },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
];

export function AdminLayout() {
  return <DashboardLayout title="Admin Panel" subtitle="Mana Oori Santha" links={links} />;
}
