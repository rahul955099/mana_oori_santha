import { Link } from "react-router-dom";
import { Package, ShoppingBag, IndianRupee, Clock, ArrowRight } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/common/Badge";
import { useProducts } from "@/context/ProductsContext";
import { useOrders } from "@/context/OrdersContext";
import { formatCurrency, formatDate } from "@/utils/format";
import { CURRENT_SELLER_ID } from "@/data/currentSeller";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/utils/orderStatus";

export default function SellerDashboard() {
  const { products } = useProducts();
  const { orders } = useOrders();

  const myProducts = products.filter((p) => p.sellerId === CURRENT_SELLER_ID);
  const myProductIds = new Set(myProducts.map((p) => p.id));
  const myOrders = orders.filter((o) => o.items.some((i) => myProductIds.has(i.productId)));
  const totalSales = myOrders.reduce(
    (sum, o) => sum + o.items.filter((i) => myProductIds.has(i.productId)).reduce((s, i) => s + i.price * i.quantity, 0),
    0
  );
  const pendingOrders = myOrders.filter((o) => o.status === "pending" || o.status === "confirmed").length;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Seller Dashboard</h1>
      <p className="mt-1 text-sm text-stone-500">Welcome back! Here's how your store is performing.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package} label="Total Products" value={String(myProducts.length)} tone="primary" />
        <StatCard icon={ShoppingBag} label="Total Orders" value={String(myOrders.length)} tone="blue" />
        <StatCard icon={IndianRupee} label="Total Sales" value={formatCurrency(totalSales)} tone="accent" />
        <StatCard icon={Clock} label="Pending Orders" value={String(pendingOrders)} tone="earth" />
      </div>

      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">Recent Orders</h2>
          <Link to="/seller/orders" className="flex items-center gap-1 text-sm font-bold text-primary-700 hover:underline">
            View All <ArrowRight size={14} />
          </Link>
        </div>
        {myOrders.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-400">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-xs font-bold uppercase text-stone-400">
                  <th className="py-2 pr-4">Order ID</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {myOrders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="border-b border-stone-50">
                    <td className="py-3 pr-4 font-semibold text-stone-800">{order.id}</td>
                    <td className="py-3 pr-4 text-stone-500">{formatDate(order.date)}</td>
                    <td className="py-3 pr-4 font-semibold text-stone-800">{formatCurrency(order.total)}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={ORDER_STATUS_TONE[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
