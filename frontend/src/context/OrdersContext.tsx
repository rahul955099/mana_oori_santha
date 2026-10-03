import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Order, OrderStatus } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";

export interface ShippingDetails {
  fullName: string;
  mobile: string;
  email: string;
  address: string;
  village: string;
  district: string;
  state: string;
  pincode: string;
}

export interface PlaceOrderInput {
  items: { productId: string; quantity: number }[];
  couponCode?: string;
  shippingAddress: ShippingDetails;
}

interface OrdersContextValue {
  /** Orders this user works with: everything for admins, sales for sellers, purchases for customers. */
  orders: Order[];
  /** Orders this user placed as a buyer. */
  myOrders: Order[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  placeOrder: (input: PlaceOrderInput) => Promise<Order>;
  /** Moves an order to a new status. The server enforces who may do what. */
  updateOrderStatus: (id: string, status: OrderStatus, note?: string) => Promise<Order>;
}

const OrdersContext = createContext<OrdersContextValue | undefined>(undefined);

type OrdersResponse = { orders: Order[] };

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const role = user?.role;
  const userId = user?.id ?? null;
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [managed, setManaged] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) {
      setMyOrders([]);
      setManaged([]);
      return;
    }
    setLoading(true);
    try {
      const managedPath = role === "admin" ? "/orders" : role === "seller" ? "/orders/seller" : null;
      const [mine, others] = await Promise.all([
        api.get<OrdersResponse>("/orders/mine"),
        managedPath ? api.get<OrdersResponse>(managedPath) : Promise.resolve(null),
      ]);
      setMyOrders(mine.orders);
      setManaged(others?.orders ?? []);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [userId, role]);

  useEffect(() => {
    // Old demo builds kept sample orders in the browser.
    try {
      localStorage.removeItem("mos_orders");
    } catch {
      // ignore
    }
    void reload();
  }, [reload]);

  function replace(list: Order[], order: Order) {
    return list.some((o) => o.id === order.id) ? list.map((o) => (o.id === order.id ? order : o)) : list;
  }

  async function placeOrder(input: PlaceOrderInput) {
    const { order } = await api.post<{ order: Order }>("/orders", input);
    setMyOrders((prev) => [order, ...prev]);
    if (role === "admin") setManaged((prev) => [order, ...prev]);
    return order;
  }

  async function updateOrderStatus(id: string, status: OrderStatus, note?: string) {
    const { order } = await api.patch<{ order: Order }>(`/orders/${id}/status`, { status, note });
    setMyOrders((prev) => replace(prev, order));
    setManaged((prev) => replace(prev, order));
    return order;
  }

  const orders = role === "admin" || role === "seller" ? managed : myOrders;

  return (
    <OrdersContext.Provider value={{ orders, myOrders, loading, error, reload, placeOrder, updateOrderStatus }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders(): OrdersContextValue {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}
