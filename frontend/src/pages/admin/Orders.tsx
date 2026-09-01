import { useState } from "react";
import { useOrders } from "@/context/OrdersContext";
import { SearchBar } from "@/components/common/SearchBar";
import { formatCurrency, formatDate } from "@/utils/format";
import type { OrderStatus } from "@/types";

const statusOptions: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

const statusTone: Record<OrderStatus, "green" | "gold" | "red" | "gray" | "blue"> = {
  pending: "gray",
  confirmed: "blue",
  shipped: "gold",
  delivered: "green",
  cancelled: "red",
};

export default function AdminOrders() {
  const { orders, updateOrderStatus } = useOrders();
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
        <SearchBar value={search} onChange={setSearch} className="flex-1" placeholder="Search by order ID or customer..." />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-600 outline-none focus:border-primary-400"
        >
          <option value="all">All Status</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

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
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-t border-stone-100">
                  <td className="px-5 py-3 font-semibold text-stone-800">{order.id}</td>
                  <td className="px-5 py-3 text-stone-600">{order.customer.fullName}</td>
                  <td className="px-5 py-3 text-stone-500">{formatDate(order.date)}</td>
                  <td className="px-5 py-3 font-semibold text-stone-800">{formatCurrency(order.total)}</td>
                  <td className="px-5 py-3 text-stone-500">{order.paymentMethod === "cod" ? "COD" : "Online"}</td>
                  <td className="px-5 py-3">
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                      className={`rounded-full border-0 px-2.5 py-1 text-xs font-bold outline-none ${
                        statusTone[order.status] === "green"
                          ? "bg-primary-100 text-primary-700"
                          : statusTone[order.status] === "gold"
                            ? "bg-accent-100 text-accent-800"
                            : statusTone[order.status] === "red"
                              ? "bg-red-100 text-red-700"
                              : statusTone[order.status] === "blue"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>{s.toUpperCase()}</option>
                      ))}
                    </select>
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
