import { useState } from "react";
import { Link } from "react-router-dom";
import { Package, ChevronDown, ChevronUp } from "lucide-react";
import { useOrders } from "@/context/OrdersContext";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/common/Badge";
import { buttonClasses } from "@/components/common/Button";
import { formatCurrency, formatDate } from "@/utils/format";
import type { OrderStatus } from "@/types";

const statusTone: Record<OrderStatus, "green" | "gold" | "red" | "gray" | "blue"> = {
  pending: "gray",
  confirmed: "blue",
  shipped: "gold",
  delivered: "green",
  cancelled: "red",
};

export default function MyOrders() {
  const { orders } = useOrders();
  const [expanded, setExpanded] = useState<string | null>(null);

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
                  <Badge tone={statusTone[order.status]}>{order.status.toUpperCase()}</Badge>
                  {isOpen ? <ChevronUp size={18} className="text-stone-400" /> : <ChevronDown size={18} className="text-stone-400" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-stone-100 p-5">
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
                    </div>
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
