import { useState } from "react";
import { Link } from "react-router-dom";
import { Package, ChevronDown, ChevronUp, LifeBuoy, XCircle, RotateCcw } from "lucide-react";
import { useOrders } from "@/context/OrdersContext";
import { useSupport } from "@/context/SupportContext";
import { useNotifications } from "@/context/NotificationContext";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/common/Badge";
import { buttonClasses } from "@/components/common/Button";
import { OrderTracker } from "@/components/orders/OrderTracker";
import { formatCurrency, formatDate } from "@/utils/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/utils/orderStatus";
import type { Order } from "@/types";

export default function MyOrders() {
  const { orders, updateOrderStatus } = useOrders();
  const { openSupport } = useSupport();
  const { notifyUser } = useNotifications();
  const [expanded, setExpanded] = useState<string | null>(null);

  function handleNeedHelp(order: Order) {
    openSupport({
      orderId: order.id,
      orderSummary: `${order.items.length} item(s) · ${formatCurrency(order.total)} · ${ORDER_STATUS_LABELS[order.status]}`,
      category: "order-issue",
    });
  }

  function handleCancel(order: Order) {
    updateOrderStatus(order.id, "cancelled");
    if (order.userId) {
      notifyUser(order.userId, {
        type: "order-status",
        title: `Order ${order.id} cancelled`,
        message: `Your order ${order.id} has been cancelled as requested.`,
        orderId: order.id,
      });
    }
  }

  function handleRequestReturn(order: Order) {
    updateOrderStatus(order.id, "return-requested");
    if (order.userId) {
      notifyUser(order.userId, {
        type: "order-status",
        title: `Return requested for ${order.id}`,
        message: `We've received your return request for order ${order.id}. Our team will review it shortly.`,
        orderId: order.id,
      });
    }
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
          const canCancel = order.status === "pending" || order.status === "confirmed";
          const canRequestReturn = order.status === "delivered";
          return (
            <div key={order.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <button
                onClick={() => setExpanded(isOpen ? null : order.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left"
              >
                <div>
                  <p className="text-sm font-bold text-stone-900">{order.id}</p>
                  <p className="text-xs text-stone-400">Placed on {formatDate(order.date)}</p>
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
                  <div className="mt-4 grid grid-cols-1 gap-4 border-t border-stone-100 pt-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase text-stone-400">Delivery Address</p>
                      <p className="text-stone-600">
                        {order.customer.fullName}, {order.customer.address}, {order.customer.village},{" "}
                        {order.customer.district}, {order.customer.state} - {order.customer.pincode}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase text-stone-400">Payment Method</p>
                      <p className="text-stone-600">
                        {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}
                      </p>
                      {order.couponCode && (
                        <p className="mt-1 text-xs text-primary-700">
                          Coupon <span className="font-bold">{order.couponCode}</span> applied
                          {order.discount ? ` (-${formatCurrency(order.discount)})` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
                    <button
                      onClick={() => handleNeedHelp(order)}
                      className="flex items-center gap-1.5 rounded-full border border-primary-600 px-4 py-2 text-xs font-bold text-primary-700 transition hover:bg-primary-50"
                    >
                      <LifeBuoy size={14} /> Need Help?
                    </button>
                    {canCancel && (
                      <button
                        onClick={() => handleCancel(order)}
                        className="flex items-center gap-1.5 rounded-full border border-red-300 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
                      >
                        <XCircle size={14} /> Cancel Order
                      </button>
                    )}
                    {canRequestReturn && (
                      <button
                        onClick={() => handleRequestReturn(order)}
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
    </div>
  );
}
