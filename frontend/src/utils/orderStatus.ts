import type { OrderStatus } from "@/types";

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
