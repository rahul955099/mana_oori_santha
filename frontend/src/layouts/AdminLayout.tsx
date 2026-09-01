import { LayoutDashboard, Package, Store, Users, ShoppingBag, LayoutGrid, BarChart3 } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import type { SidebarLink } from "@/components/layout/DashboardSidebar";

const links: SidebarLink[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/sellers", label: "Sellers", icon: Store },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/categories", label: "Categories", icon: LayoutGrid },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
];

export function AdminLayout() {
  return <DashboardLayout title="Admin Panel" subtitle="Mana Oori Santha" links={links} />;
}
