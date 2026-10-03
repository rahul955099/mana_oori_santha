import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Package, ChevronDown, ChevronUp, LifeBuoy, XCircle, RotateCcw, FileText } from "lucide-react";
import { useOrders } from "@/context/OrdersContext";
import { useSupport } from "@/context/SupportContext";
import { useToast } from "@/context/ToastContext";
import { useProducts } from "@/context/ProductsContext";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import { buttonClasses } from "@/components/common/Button";
import { OrderTracker } from "@/components/orders/OrderTracker";
import { errorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/utils/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, canCustomerCancel, canCustomerReturn } from "@/utils/orderStatus";
import type { Order, OrderStatus } from "@/types";

type PendingAction = { order: Order; status: Extract<OrderStatus, "cancelled" | "return-requested"> };

export default function MyOrders() {
  const { myOrders: orders, loading, updateOrderStatus } = useOrders();
  const { reload: reloadProducts } = useProducts();
  const { openSupport } = useSupport();
  const { showToast } = useToast();
  const location = useLocation();
  const placedOrderId = (location.state as { placedOrderId?: string } | null)?.placedOrderId ?? null;
  const [expanded, setExpanded] = useState<string | null>(placedOrderId);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);

  function handleNeedHelp(order: Order) {
    openSupport({
      orderId: order.id,
      orderSummary: `${order.items.length} item(s) · ${formatCurrency(order.total)} · ${ORDER_STATUS_LABELS[order.status]}`,
      category: "order-issue",
    });
  }

  async function confirmAction() {
    if (!pending) return;
    const { order, status } = pending;
    setBusy(true);
    try {
      await updateOrderStatus(order.id, status);
      const cancelled = status === "cancelled";
      if (cancelled) void reloadProducts(); // stock was returned
      showToast(cancelled ? `Order ${order.id} cancelled` : "Return requested");
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  if (loading && orders.length === 0) {
    return <Loading label="Loading your orders..." />;
  }

  if (orders.length === 0) {
    return (
      <div className="container-app py-16">
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="You haven't placed any orders. Start shopping to see them here."
          action={
            <Link to="/products" className={buttonClasses("primary", "md", "mt-2")}>
              Browse Products
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-app py-10">
      <h1 className="mb-8 text-3xl font-extrabold text-stone-900">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => {
          const isOpen = expanded === order.id;
          const canCancel = canCustomerCancel(order);
          const canReturn = canCustomerReturn(order);
          return (
            <div
              key={order.id}
              className={`overflow-hidden rounded-2xl border bg-white ${order.id === placedOrderId ? "border-primary-400" : "border-stone-200"}`}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : order.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left"
              >
                <div>
                  <p className="text-sm font-bold text-stone-900">{order.id}</p>
                  <p className="text-xs text-stone-400">Placed on {formatDate(order.createdAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <p className="text-xs text-stone-500">{order.items.length} item(s)</p>
                  <p className="text-sm font-extrabold text-stone-900">{formatCurrency(order.total)}</p>
                  <Badge tone={ORDER_STATUS_TONE[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                  {isOpen ? <ChevronUp size={18} className="text-stone-400" /> : <ChevronDown size={18} className="text-stone-400" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-stone-100 p-5">
                  <div className="mb-5 overflow-x-auto pb-1">
                    <OrderTracker status={order.status} />
                  </div>

                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.productId} className="flex items-center gap-3">
                        <img src={item.image} alt={item.name} className="h-14 w-14 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-stone-800">{item.name}</p>
                          <p className="text-xs text-stone-400">
                            {item.quantity} × {formatCurrency(item.price)} ({item.unit})
                          </p>
                        </div>
                        <p className="text-sm font-bold text-stone-800">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>

                  <dl className="mt-4 space-y-1.5 border-t border-stone-100 pt-4 text-sm">
                    <div className="flex justify-between text-stone-600">
                      <dt>Subtotal</dt>
                      <dd>{formatCurrency(order.subtotal)}</dd>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between text-primary-700">
                        <dt>Coupon {order.couponCode}</dt>
                        <dd>-{formatCurrency(order.discount)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between text-stone-600">
                      <dt>Delivery</dt>
                      <dd>{order.deliveryCharge === 0 ? "FREE" : formatCurrency(order.deliveryCharge)}</dd>
                    </div>
                    <div className="flex justify-between font-extrabold text-stone-900">
                      <dt>Total</dt>
                      <dd>{formatCurrency(order.total)}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 grid grid-cols-1 gap-4 border-t border-stone-100 pt-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase text-stone-400">Delivery Address</p>
                      <p className="text-stone-600">
                        {order.customer.fullName}, {order.customer.address}, {order.customer.village},{" "}
                        {order.customer.district && `${order.customer.district}, `}
                        {order.customer.state} - {order.customer.pincode}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase text-stone-400">Payment</p>
                      <p className="text-stone-600">
                        Cash on Delivery · {order.paymentStatus === "paid" ? "Paid" : order.paymentStatus === "refunded" ? "Refunded" : "Pay on delivery"}
                      </p>
                      {canReturn && order.returnDeadline && (
                        <p className="mt-1 text-xs text-stone-500">Return available until {formatDate(order.returnDeadline)}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
                    <Link
                      to={`/orders/${order.id}/invoice`}
                      className="flex items-center gap-1.5 rounded-full border border-stone-300 px-4 py-2 text-xs font-bold text-stone-600 transition hover:bg-stone-50"
                    >
                      <FileText size={14} /> Invoice
                    </Link>
                    <button
                      onClick={() => handleNeedHelp(order)}
                      className="flex items-center gap-1.5 rounded-full border border-primary-600 px-4 py-2 text-xs font-bold text-primary-700 transition hover:bg-primary-50"
                    >
                      <LifeBuoy size={14} /> Need Help?
                    </button>
                    {canCancel && (
                      <button
                        onClick={() => setPending({ order, status: "cancelled" })}
                        className="flex items-center gap-1.5 rounded-full border border-red-300 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
                      >
                        <XCircle size={14} /> Cancel Order
                      </button>
                    )}
                    {canReturn && (
                      <button
                        onClick={() => setPending({ order, status: "return-requested" })}
                        className="flex items-center gap-1.5 rounded-full border border-accent-400 px-4 py-2 text-xs font-bold text-accent-700 transition hover:bg-accent-50"
                      >
                        <RotateCcw size={14} /> Request Return
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={!!pending}
        onClose={() => setPending(null)}
        title={pending?.status === "cancelled" ? "Cancel Order" : "Request Return"}
      >
        <p className="text-sm text-stone-600">
          {pending?.status === "cancelled"
            ? `Cancel order ${pending?.order.id}? This can't be undone.`
            : `Request a return for order ${pending?.order.id}? Our team will review it and contact you.`}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setPending(null)} className={buttonClasses("ghost", "sm")}>
            Keep Order
          </button>
          <button onClick={confirmAction} disabled={busy} className={buttonClasses("danger", "sm")}>
            {pending?.status === "cancelled" ? "Cancel Order" : "Request Return"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
