import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Store, Package, ShoppingBag, IndianRupee, Clock, LifeBuoy, RotateCcw, ArrowRight } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/common/Badge";
import { Loading } from "@/components/common/Loading";
import { useOrders } from "@/context/OrdersContext";
import { api, errorMessage } from "@/lib/api";
import { isoDaysAgo, type SalesReport } from "@/lib/reports";
import { formatCurrency, formatDate } from "@/utils/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/utils/orderStatus";

/** Work waiting for an admin, linking to where it's done. */
function TodoRow({ to, label, count }: { to: string; label: string; count: number }) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-stone-50">
      <span className="text-stone-600">{label}</span>
      <span className="flex items-center gap-2">
        <span className={`font-bold ${count > 0 ? "text-stone-900" : "text-stone-400"}`}>{count}</span>
        <ArrowRight size={14} className="text-stone-400" />
      </span>
    </Link>
  );
}

export default function AdminDashboard() {
  const { orders } = useOrders();
  const [report, setReport] = useState<SalesReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<SalesReport>("/admin/reports/summary", { from: isoDaysAgo(29), to: isoDaysAgo(0) })
      .then(setReport)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  if (!report) return <Loading label="Loading dashboard..." />;

  const s = report.snapshot;
  const t = report.totals;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-stone-500">Marketplace at a glance. Sales figures cover the last 30 days.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={IndianRupee} label="Revenue (30 days)" value={formatCurrency(t.revenue)} tone="primary" />
        <StatCard icon={ShoppingBag} label="Orders (30 days)" value={String(t.orders)} tone="blue" />
        <StatCard icon={Users} label="Active Customers" value={String(s.customers)} tone="accent" />
        <StatCard icon={Store} label="Approved Sellers" value={String(s.approvedSellers)} tone="earth" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="mb-3 text-lg font-bold text-stone-900">Needs Attention</h2>
          <TodoRow to="/admin/orders" label="Orders to fulfil" count={s.openOrders} />
          <TodoRow to="/admin/orders" label="Return requests" count={s.returnRequests} />
          <TodoRow to="/admin/sellers" label="Sellers awaiting approval" count={s.pendingSellers} />
          <TodoRow to="/admin/support" label="Open support requests" count={s.openTickets} />
          <TodoRow to="/admin/products" label="Products out of stock" count={s.outOfStock} />
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">Recent Orders</h2>
            <Link to="/admin/orders" className="flex items-center gap-1 text-sm font-bold text-primary-700 hover:underline">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          {orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-400">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 6).map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b border-stone-50 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{order.id}</p>
                    <p className="text-xs text-stone-400">
                      {formatDate(order.createdAt)} · {order.customer.fullName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-stone-900">{formatCurrency(order.total)}</span>
                    <Badge tone={ORDER_STATUS_TONE[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package} label="Live Products" value={String(s.liveProducts)} tone="primary" />
        <StatCard icon={Clock} label="Orders in Progress" value={String(s.openOrders)} tone="accent" />
        <StatCard icon={RotateCcw} label="Returns to Review" value={String(s.returnRequests)} tone="earth" />
        <StatCard icon={LifeBuoy} label="Open Support Requests" value={String(s.openTickets)} tone="blue" />
      </div>
    </div>
  );
}
