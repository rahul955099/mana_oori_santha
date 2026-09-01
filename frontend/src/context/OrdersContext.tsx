import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Order, OrderStatus } from "@/types";
import { mockOrders } from "@/data/orders";

interface OrdersContextValue {
  orders: Order[];
  placeOrder: (order: Omit<Order, "id" | "date" | "status">) => Order;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
}

const OrdersContext = createContext<OrdersContextValue | undefined>(undefined);
const STORAGE_KEY = "mos_orders";

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Order[]) : mockOrders;
    } catch {
      return mockOrders;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  function placeOrder(order: Omit<Order, "id" | "date" | "status">): Order {
    const newOrder: Order = {
      ...order,
      id: `MOS-${Math.floor(10000 + Math.random() * 89999)}`,
      date: new Date().toISOString().slice(0, 10),
      status: "pending",
    };
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  }

  function updateOrderStatus(id: string, status: OrderStatus) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  return (
    <OrdersContext.Provider value={{ orders, placeOrder, updateOrderStatus }}>{children}</OrdersContext.Provider>
  );
}

export function useOrders(): OrdersContextValue {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}
