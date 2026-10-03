import { useState } from "react";
import { useOrders } from "@/context/OrdersContext";
import { SearchBar } from "@/components/common/SearchBar";
import { formatCurrency, formatDate } from "@/utils/format";
import { Link } from "react-router-dom";
import { OrderStatusControl } from "@/components/orders/OrderStatusControl";
import { Loading } from "@/components/common/Loading";
import { ALL_ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/utils/orderStatus";
import type { OrderStatus } from "@/types";

const statusOptions = ALL_ORDER_STATUSES;

export default function AdminOrders() {
  const { orders, loading } = useOrders();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");

  const filtered = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.fullName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Orders</h1>
      <p className="mt-1 text-sm text-stone-500">All orders placed across the marketplace.</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <SearchBar value={search} onChange={setSearch} className="flex-1" placeholder="Search by order ID or customer..." suggestions={false} />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-600 outline-none focus:border-primary-400"
        >
          <option value="all">All Status</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {loading && orders.length === 0 && <Loading label="Loading orders..." />}
      {!loading && filtered.length === 0 && <p className="mt-8 text-center text-sm text-stone-400">No orders found.</p>}

      <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50">
              <tr className="text-xs font-bold uppercase text-stone-400">
                <th className="px-5 py-3">Order ID</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Payment</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-t border-stone-100">
                  <td className="px-5 py-3 font-semibold text-stone-800">{order.id}</td>
                  <td className="px-5 py-3 text-stone-600">{order.customer.fullName}</td>
                  <td className="px-5 py-3 text-stone-500">{formatDate(order.date)}</td>
                  <td className="px-5 py-3 font-semibold text-stone-800">{formatCurrency(order.total)}</td>
                  <td className="px-5 py-3 text-stone-500">COD · {order.paymentStatus}</td>
                  <td className="px-5 py-3">
                    <OrderStatusControl order={order} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link to={`/orders/${order.id}/invoice`} className="text-xs font-semibold text-primary-700 hover:underline">
                      Invoice
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
