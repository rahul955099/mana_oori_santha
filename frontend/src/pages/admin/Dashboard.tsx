import { Users, Store, Package, ShoppingBag, IndianRupee, Clock, LifeBuoy } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/common/Badge";
import { useProducts } from "@/context/ProductsContext";
import { useOrders } from "@/context/OrdersContext";
import { useSupport } from "@/context/SupportContext";
import { useSellers } from "@/context/SellersContext";
import { customers } from "@/data/customers";
import { formatCurrency, formatDate } from "@/utils/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/utils/orderStatus";

export default function AdminDashboard() {
  const { products } = useProducts();
  const { orders } = useOrders();
  const { requests } = useSupport();
  const { sellers } = useSellers();
  const totalRevenue = orders
    .filter((o) => o.status !== "cancelled" && o.status !== "returned")
    .reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
  const openSupportRequests = requests.filter((r) => r.status !== "resolved").length;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-stone-500">Overview of the entire Mana Oori Santha marketplace.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={String(customers.length)} tone="blue" />
        <StatCard icon={Store} label="Total Farmers/Sellers" value={String(sellers.length)} tone="primary" />
        <StatCard icon={Package} label="Total Products" value={String(products.length)} tone="accent" />
        <StatCard icon={ShoppingBag} label="Total Orders" value={String(orders.length)} tone="earth" />
        <StatCard icon={IndianRupee} label="Total Revenue" value={formatCurrency(totalRevenue)} tone="primary" />
        <StatCard icon={Clock} label="Pending Orders" value={String(pendingOrders)} tone="accent" />
        <StatCard icon={Package} label="Delivered Orders" value={String(deliveredOrders)} tone="primary" />
        <StatCard icon={LifeBuoy} label="Support Requests" value={String(openSupportRequests)} tone="blue" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-stone-900">Recent Orders</h2>
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between border-b border-stone-50 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold text-stone-800">{order.id}</p>
                  <p className="text-xs text-stone-400">{formatDate(order.date)} · {order.customer.fullName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-stone-900">{formatCurrency(order.total)}</span>
                  <Badge tone={ORDER_STATUS_TONE[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-stone-900">Top Sellers</h2>
          <div className="space-y-3">
            {sellers
              .slice()
              .sort((a, b) => b.rating - a.rating)
              .map((seller) => (
                <div key={seller.id} className="flex items-center gap-3 border-b border-stone-50 pb-3 last:border-0 last:pb-0">
                  <img src={seller.image} alt={seller.name} className="h-10 w-10 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-800">{seller.farmName}</p>
                    <p className="text-xs text-stone-400">{seller.location}, {seller.state}</p>
                  </div>
                  <span className="text-xs font-bold text-accent-600">★ {seller.rating}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
