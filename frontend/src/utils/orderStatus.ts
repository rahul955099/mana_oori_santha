import type { Order, OrderStatus, UserRole } from "@/types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Order Placed",
  confirmed: "Order Confirmed",
  packed: "Packed",
  "out-for-delivery": "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  "return-requested": "Return Requested",
  returned: "Returned",
};

export type BadgeTone = "green" | "gold" | "red" | "gray" | "blue";

export const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  pending: "gray",
  confirmed: "blue",
  packed: "blue",
  "out-for-delivery": "gold",
  delivered: "green",
  cancelled: "red",
  "return-requested": "red",
  returned: "gray",
};

/** The linear "happy path" an order normally travels through. */
export const ORDER_TRACKING_STEPS: OrderStatus[] = [
  "pending",
  "confirmed",
  "packed",
  "out-for-delivery",
  "delivered",
];

export const ALL_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "packed",
  "out-for-delivery",
  "delivered",
  "cancelled",
  "return-requested",
  "returned",
];

/** -1 when the order has left the linear happy path (cancelled/return/returned). */
export function getTrackingStepIndex(status: OrderStatus): number {
  return ORDER_TRACKING_STEPS.indexOf(status);
}

export function isTerminalOffPathStatus(status: OrderStatus): boolean {
  return status === "cancelled" || status === "return-requested" || status === "returned";
}

/** Allowed next statuses — mirrors the backend's rules in order.service.ts. */
const FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["out-for-delivery", "cancelled"],
  "out-for-delivery": ["delivered"],
  delivered: ["return-requested"],
  "return-requested": ["returned", "delivered"],
  returned: [],
  cancelled: [],
};

/** Statuses an admin or seller can move an order to from the management screens.
 * Sellers can't approve returns; return requests come from customers. */
export function managementNextStatuses(order: Order, role: UserRole): OrderStatus[] {
  const next = FLOW[order.status].filter((s) => s !== "return-requested");
  if (role === "admin") return next;
  if (role === "seller" && !order.partial) return next.filter((s) => s !== "returned" && order.status !== "return-requested");
  return [];
}

/** Label for moving back from "return-requested" to "delivered". */
export function transitionLabel(from: OrderStatus, to: OrderStatus): string {
  if (from === "return-requested" && to === "delivered") return "Reject Return";
  if (to === "returned") return "Approve Return";
  if (to === "cancelled") return "Cancel Order";
  return `Mark ${ORDER_STATUS_LABELS[to]}`;
}

export function canCustomerCancel(order: Order): boolean {
  return order.status === "pending" || order.status === "confirmed";
}

export function canCustomerReturn(order: Order): boolean {
  return order.status === "delivered" && !!order.returnDeadline && new Date(order.returnDeadline) > new Date();
}
