import { useState, type FormEvent } from "react";
import { useOrders } from "@/context/OrdersContext";
import { useAuth } from "@/context/AuthContext";
import { useProducts } from "@/context/ProductsContext";
import { useToast } from "@/context/ToastContext";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import { buttonClasses } from "@/components/common/Button";
import { errorMessage } from "@/lib/api";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, managementNextStatuses, transitionLabel } from "@/utils/orderStatus";
import type { Order, OrderStatus } from "@/types";

const inputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

/** Status badge plus a menu of the moves this admin/seller is allowed to make. */
export function OrderStatusControl({ order }: { order: Order }) {
  const { user } = useAuth();
  const { updateOrderStatus } = useOrders();
  const { reload: reloadProducts } = useProducts();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [deliveringOpen, setDeliveringOpen] = useState(false);

  const options = user ? managementNextStatuses(order, user.role) : [];
  const d = order.delivery;

  async function change(status: OrderStatus) {
    if (status === "cancelled" && !window.confirm(`Cancel order ${order.id}? Stock will be returned.`)) return;
    // Handing over an order needs the customer's code (newer orders have one).
    if (status === "delivered" && order.status === "out-for-delivery" && d) {
      setDeliveringOpen(true);
      return;
    }
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
    <div className="flex flex-col gap-1">
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
      </div>
      {user?.role === "seller" && order.partial && order.status !== "cancelled" && (
        <span className="text-[11px] text-stone-400">Multi-seller order · managed by admin</span>
      )}
      {user?.role === "seller" && d && (
        <span className="text-[11px] text-stone-500">
          {d.mode === "self"
            ? "You deliver this order"
            : d.partnerName
              ? `Delivery partner: ${d.partnerName}${d.partnerPhone ? ` · ${d.partnerPhone}` : ""}`
              : "A delivery partner will pick it up"}
        </span>
      )}
      {deliveringOpen && <DeliveredModal order={order} onClose={() => setDeliveringOpen(false)} />}
    </div>
  );
}

/** Asks for the customer's 4-digit code. Admins can instead give a reason to skip it. */
function DeliveredModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { user } = useAuth();
  const { updateOrderStatus } = useOrders();
  const { showToast } = useToast();
  const isAdmin = user?.role === "admin";
  const [code, setCode] = useState("");
  const [skipping, setSkipping] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await updateOrderStatus(order.id, "delivered", undefined, skipping ? { skipCodeReason: reason.trim() } : { code: code.trim() });
      showToast(`Order ${order.id}: Delivered`);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Mark ${order.id} delivered`}>
      <form onSubmit={submit} className="space-y-4">
        {!skipping ? (
          <div>
            <label htmlFor="delivery-code" className="mb-1.5 block text-xs font-bold text-stone-600">
              Customer's 4-digit delivery code
            </label>
            <input
              id="delivery-code"
              required
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={`${inputClass} text-center text-2xl font-bold tracking-[0.5em]`}
            />
            <p className="mt-1.5 text-xs text-stone-400">The customer sees this code in My Orders and in their "out for delivery" email.</p>
          </div>
        ) : (
          <div>
            <label htmlFor="skip-reason" className="mb-1.5 block text-xs font-bold text-stone-600">
              Why are you marking it delivered without the code?
            </label>
            <textarea
              id="skip-reason"
              required
              minLength={5}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer didn't receive the code; confirmed delivery on a phone call."
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-stone-400">This is saved in the order history and the admin activity log.</p>
          </div>
        )}
        {isAdmin && (
          <button type="button" onClick={() => setSkipping((v) => !v)} className="text-xs font-semibold text-primary-700 hover:underline">
            {skipping ? "I have the code" : "The customer didn't get a code"}
          </button>
        )}
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className={buttonClasses("ghost", "sm")}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={buttonClasses("primary", "sm")}>
            {saving ? "Saving..." : "Mark Delivered"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
