import { useState } from "react";
import { useOrders } from "@/context/OrdersContext";
import { OrderStatusControl } from "@/components/orders/OrderStatusControl";
import { EmptyState } from "@/components/common/EmptyState";
import { formatCurrency, formatDate } from "@/utils/format";
import { useAuth } from "@/context/AuthContext";
import type { OrderStatus } from "@/types";
import { ALL_ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/utils/orderStatus";
import { ShoppingBag } from "lucide-react";

export default function SellerOrders() {
  const sellerId = useAuth().user?.sellerId;
  const { orders } = useOrders();
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");

  // The API returns only orders containing this seller's items, with other sellers' items removed.
  let myOrders = orders;
  if (statusFilter !== "all") {
    myOrders = myOrders.filter((o) => o.status === statusFilter);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Orders</h1>
          <p className="mt-1 text-sm text-stone-500">Orders containing your products.</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 outline-none focus:border-primary-400"
        >
          <option value="all">All Status</option>
          {ALL_ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {myOrders.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No orders found" description="No orders match this filter yet." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50">
                <tr className="text-xs font-bold uppercase text-stone-400">
                  <th className="px-5 py-3">Order ID</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {myOrders.map((order) => {
                  const myItems = order.items.filter((i) => i.sellerId === sellerId);
                  const amount = myItems.reduce((s, i) => s + i.price * i.quantity, 0);
                  return (
                    <tr key={order.id} className="border-t border-stone-100">
                      <td className="px-5 py-3 font-semibold text-stone-800">{order.id}</td>
                      <td className="px-5 py-3 text-stone-500">{formatDate(order.date)}</td>
                      <td className="px-5 py-3 text-stone-600">{order.customer.fullName}</td>
                      <td className="px-5 py-3 text-stone-500">{myItems.length} item(s)</td>
                      <td className="px-5 py-3 font-semibold text-stone-800">{formatCurrency(amount)}</td>
                      <td className="px-5 py-3">
                        <OrderStatusControl order={order} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
