import { LayoutDashboard, Package, PlusCircle, ShoppingBag, Wallet, UserCircle } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { SellerAccountProvider } from "@/context/SellerAccountContext";
import type { SidebarLink } from "@/components/layout/DashboardSidebar";

const links: SidebarLink[] = [
  { to: "/seller/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/seller/products", label: "My Products", icon: Package },
  { to: "/seller/products/add", label: "Add Product", icon: PlusCircle },
  { to: "/seller/orders", label: "Orders", icon: ShoppingBag },
  { to: "/seller/earnings", label: "Earnings", icon: Wallet },
  { to: "/seller/profile", label: "Profile", icon: UserCircle },
];

export function SellerLayout() {
  return (
    <SellerAccountProvider>
      <DashboardLayout title="Seller Panel" subtitle="Mana Oori Santha" links={links} />
    </SellerAccountProvider>
  );
}
