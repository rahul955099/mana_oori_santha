import type { DeliveryLocation } from "@/types";

export interface DeliveryEstimate {
  available: boolean;
  etaLabel: string;
  /** null means "not yet known" — render a placeholder instead of ₹0. */
  charge: number | null;
}

/**
 * Placeholder delivery-rules lookup. Replace the body with a real API call
 * (e.g. `POST /api/delivery/estimate` keyed by pincode/lat-lng) once backend
 * delivery rules exist — the DeliveryInfo component only depends on this
 * function's return shape, so no UI changes are needed when it's wired up.
 */
export function getDeliveryEstimate(location: DeliveryLocation | null): DeliveryEstimate {
  if (!location) {
    return { available: false, etaLabel: "Select a delivery location", charge: null };
  }
  return { available: true, etaLabel: "1–2 days", charge: null };
}
