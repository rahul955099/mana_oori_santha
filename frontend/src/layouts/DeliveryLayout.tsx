import { Truck, History, Wallet } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import type { SidebarLink } from "@/components/layout/DashboardSidebar";

const links: SidebarLink[] = [
  { to: "/delivery/dashboard", label: "Today's Deliveries", icon: Truck },
  { to: "/delivery/history", label: "History", icon: History },
  { to: "/delivery/earnings", label: "Earnings", icon: Wallet },
];

export function DeliveryLayout() {
  return <DashboardLayout title="Delivery Partner" subtitle="Mana Oori Santha" links={links} />;
}
