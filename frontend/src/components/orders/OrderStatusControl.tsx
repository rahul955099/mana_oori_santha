import { useState } from "react";
import { useOrders } from "@/context/OrdersContext";
import { useAuth } from "@/context/AuthContext";
import { useProducts } from "@/context/ProductsContext";
import { useToast } from "@/context/ToastContext";
import { Badge } from "@/components/common/Badge";
import { errorMessage } from "@/lib/api";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, managementNextStatuses, transitionLabel } from "@/utils/orderStatus";
import type { Order, OrderStatus } from "@/types";

/** Status badge plus a menu of the moves this admin/seller is allowed to make. */
export function OrderStatusControl({ order }: { order: Order }) {
  const { user } = useAuth();
  const { updateOrderStatus } = useOrders();
  const { reload: reloadProducts } = useProducts();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const options = user ? managementNextStatuses(order, user.role) : [];

  async function change(status: OrderStatus) {
    if (status === "cancelled" && !window.confirm(`Cancel order ${order.id}? Stock will be returned.`)) return;
    setBusy(true);
    try {
      await updateOrderStatus(order.id, status);
      if (status === "cancelled") void reloadProducts();
      showToast(`Order ${order.id}: ${ORDER_STATUS_LABELS[status]}`);
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={ORDER_STATUS_TONE[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
      {options.length > 0 && (
        <select
          value=""
          disabled={busy}
          onChange={(e) => e.target.value && change(e.target.value as OrderStatus)}
          aria-label={`Update status of ${order.id}`}
          className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-600 outline-none focus:border-primary-400"
        >
          <option value="">{busy ? "Updating..." : "Update…"}</option>
          {options.map((s) => (
            <option key={s} value={s}>
              {transitionLabel(order.status, s)}
            </option>
          ))}
        </select>
      )}
      {user?.role === "seller" && order.partial && order.status !== "cancelled" && (
        <span className="text-[11px] text-stone-400">Multi-seller order · managed by admin</span>
      )}
    </div>
  );
}
