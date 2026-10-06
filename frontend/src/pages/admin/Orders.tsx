import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Truck, UserX } from "lucide-react";
import { useOrders } from "@/context/OrdersContext";
import { useToast } from "@/context/ToastContext";
import { SearchBar } from "@/components/common/SearchBar";
import { formatCurrency, formatDate } from "@/utils/format";
import { OrderStatusControl } from "@/components/orders/OrderStatusControl";
import { AssignPartnerModal } from "@/components/admin/AssignPartnerModal";
import { Loading } from "@/components/common/Loading";
import { buttonClasses } from "@/components/common/Button";
import { api, errorMessage } from "@/lib/api";
import { ALL_ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/utils/orderStatus";
import { ATTENTION_TEXT, type DeliverySettings } from "@/types/delivery";
import type { Order, OrderStatus } from "@/types";

const statusOptions = ALL_ORDER_STATUSES;
type DeliveryFilter = "all" | "unassigned" | "attention";

/** Orders waiting for a delivery partner (the shop has confirmed them). */
function needsPartner(o: Order) {
  return o.delivery?.mode === "partner" && !o.delivery.partnerId && (o.status === "confirmed" || o.status === "packed");
}
function canAssign(o: Order) {
  return o.status === "confirmed" || o.status === "packed";
}

export default function AdminOrders() {
  const { orders, loading, reload } = useOrders();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [assigning, setAssigning] = useState<Order[] | null>(null);
  const [attemptFee, setAttemptFee] = useState(30);

  useEffect(() => {
    api
      .get<{ settings: DeliverySettings }>("/admin/delivery/settings")
      .then((r) => setAttemptFee(r.settings.feePerDelivery))
      .catch(() => {});
  }, []);

  const unassignedCount = orders.filter(needsPartner).length;
  const attentionCount = orders.filter((o) => o.delivery?.needsAttention).length;

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchesSearch = o.id.toLowerCase().includes(q) || o.customer.fullName.toLowerCase().includes(q) || o.customer.pincode.includes(q);
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const matchesDelivery =
      deliveryFilter === "all" || (deliveryFilter === "unassigned" ? needsPartner(o) : !!o.delivery?.needsAttention);
    return matchesSearch && matchesStatus && matchesDelivery;
  });
  const selectable = filtered.filter(canAssign);
  const selectedOrders = orders.filter((o) => selected.includes(o.id));

  async function run(task: () => Promise<unknown>, message: string) {
    try {
      await task();
      showToast(message);
      await reload();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const chip = (value: DeliveryFilter, label: string, count?: number) => (
    <button
      onClick={() => {
        setDeliveryFilter(value);
        setSelected([]);
      }}
      className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
        deliveryFilter === value ? "border-primary-600 bg-primary-600 text-white" : "border-stone-200 bg-white text-stone-600 hover:border-primary-300"
      }`}
    >
      {label}
      {count ? ` (${count})` : ""}
    </button>
  );

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Orders</h1>
      <p className="mt-1 text-sm text-stone-500">All orders placed across the marketplace.</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <SearchBar value={search} onChange={setSearch} className="flex-1" placeholder="Search by order ID, customer or pincode..." suggestions={false} />
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {chip("all", "All orders")}
        {chip("unassigned", "Needs a delivery partner", unassignedCount)}
        {chip("attention", "Needs attention", attentionCount)}
        {selected.length > 0 && (
          <button onClick={() => setAssigning(selectedOrders)} className={`${buttonClasses("primary", "sm")} ml-auto`}>
            <Truck size={14} /> Assign {selected.length} selected
          </button>
        )}
      </div>

      {loading && orders.length === 0 && <Loading label="Loading orders..." />}
      {!loading && filtered.length === 0 && <p className="mt-8 text-center text-sm text-stone-400">No orders found.</p>}

      <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50">
              <tr className="text-xs font-bold uppercase text-stone-400">
                <th className="py-3 pl-4">
                  <input
                    type="checkbox"
                    aria-label="Select all orders that can be assigned"
                    checked={selectable.length > 0 && selectable.every((o) => selected.includes(o.id))}
                    onChange={(e) => setSelected(e.target.checked ? selectable.map((o) => o.id) : [])}
                    className="h-4 w-4"
                  />
                </th>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const d = order.delivery;
                return (
                  <tr key={order.id} className="border-t border-stone-100 align-top">
                    <td className="py-3 pl-4">
                      {canAssign(order) && (
                        <input type="checkbox" aria-label={`Select ${order.id}`} checked={selected.includes(order.id)} onChange={() => toggle(order.id)} className="h-4 w-4" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-800">{order.id}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {order.customer.fullName}
                      <p className="text-xs text-stone-400">{order.customer.village} · {order.customer.pincode}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-500">{formatDate(order.date)}</td>
                    <td className="px-4 py-3 font-semibold text-stone-800">
                      {formatCurrency(order.total)}
                      <p className="text-xs font-normal text-stone-400">COD · {order.paymentStatus}</p>
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusControl order={order} />
                    </td>
                    <td className="min-w-56 px-4 py-3 text-xs">
                      {!d ? (
                        <span className="text-stone-400">Seller delivered</span>
                      ) : d.mode === "self" && !d.partnerId ? (
                        <span className="text-stone-500">Seller delivers</span>
                      ) : d.partnerName ? (
                        <div>
                          <p className="font-semibold text-stone-800">{d.partnerName}</p>
                          <p className="text-stone-400">
                            {d.partnerPhone}
                            {canAssign(order) && (d.acceptedAt ? " · accepted" : " · waiting to accept")}
                          </p>
                          {canAssign(order) && (
                            <div className="mt-1 flex gap-3">
                              <button onClick={() => setAssigning([order])} className="font-semibold text-primary-700 hover:underline">Reassign</button>
                              <button
                                onClick={() => run(() => api.post(`/admin/delivery/orders/${order.id}/unassign`), "Partner removed from the order.")}
                                className="inline-flex items-center gap-1 font-semibold text-red-600 hover:underline"
                              >
                                <UserX size={12} /> Remove
                              </button>
                            </div>
                          )}
                        </div>
                      ) : canAssign(order) ? (
                        <button onClick={() => setAssigning([order])} className={buttonClasses("primary", "sm")}>
                          <Truck size={13} /> Assign partner
                        </button>
                      ) : (
                        <span className="text-stone-500">Delivery partner (after the shop confirms)</span>
                      )}

                      {d?.cashCollected !== undefined && (
                        <p className="mt-1 text-stone-500">
                          Collected {formatCurrency(d.cashCollected)} · fee {formatCurrency(d.fee ?? 0)}
                        </p>
                      )}
                      {d?.codeSkipped && <p className="mt-1 text-accent-700">Delivered without code by {d.codeSkipped.byName}: {d.codeSkipped.reason}</p>}

                      {d?.needsAttention && (
                        <div className="mt-2 rounded-lg bg-red-50 p-2 text-red-700">
                          <p className="flex items-center gap-1 font-semibold">
                            <AlertTriangle size={12} /> {ATTENTION_TEXT[d.needsAttention]}
                          </p>
                          {d.attempts?.slice(-3).map((a) => (
                            <p key={a.index} className="mt-0.5 text-red-600">
                              {a.partnerName ?? "Partner"}: {a.kind === "failed" ? a.reason : a.kind === "declined" ? `declined${a.reason ? ` (${a.reason})` : ""}` : "no response"}
                              {a.kind === "failed" && (
                                <button
                                  onClick={() =>
                                    run(
                                      () => api.patch(`/admin/delivery/orders/${order.id}/attempts/${a.index}/fee`, { fee: a.fee > 0 ? 0 : attemptFee }),
                                      a.fee > 0 ? "Attempt fee removed." : "Attempt fee granted."
                                    )
                                  }
                                  className="ml-2 font-semibold underline"
                                >
                                  {a.fee > 0 ? `Remove ₹${a.fee} fee` : `Pay ₹${attemptFee} for the attempt`}
                                </button>
                              )}
                            </p>
                          ))}
                          <button
                            onClick={() => run(() => api.post(`/admin/delivery/orders/${order.id}/resolve`), "Marked as handled.")}
                            className="mt-1 font-semibold underline"
                          >
                            Mark handled
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/orders/${order.id}/invoice`} className="text-xs font-semibold text-primary-700 hover:underline">
                        Invoice
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {assigning && (
        <AssignPartnerModal
          orders={assigning}
          onClose={() => setAssigning(null)}
          onAssigned={async () => {
            setAssigning(null);
            setSelected([]);
            await reload();
          }}
        />
      )}
    </div>
  );
}
