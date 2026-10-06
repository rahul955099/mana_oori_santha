/** Types for delivery partners and order delivery details (mirrors the backend). */

export type Vehicle = "bike" | "auto" | "van";
export type DeliveryMethod = "self" | "partner";

export interface DeliveryAttempt {
  index: number;
  kind: "failed" | "declined" | "no-response";
  at: string;
  partnerName?: string;
  reason?: string;
  note?: string;
  fee: number;
}

/** Delivery details on an order. Fields depend on who's looking: only the
 * customer gets `code`; admins get the tracking fields. */
export interface OrderDelivery {
  mode: DeliveryMethod;
  partnerName?: string;
  partnerPhone?: string;
  code?: string;
  partnerId?: string;
  assignedAt?: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  pickups?: number;
  cashCollected?: number;
  fee?: number;
  codeSkipped?: { byName: string; reason: string; at: string };
  needsAttention?: "declined" | "no-response" | "failed" | "cash-mismatch";
  attempts?: DeliveryAttempt[];
}

export interface DeliverySettings {
  feePerDelivery: number;
  extraPickupFee: number;
  maxActiveDeliveries: number;
  cashLimit: number;
  acceptWithinMinutes: number;
}

export interface PartnerStats {
  active: number;
  delivered30: number;
  problems30: number;
  successRate: number | null;
  deliveredTotal: number;
  cashCollected: number;
  feesEarned: number;
  cashReceived: number;
  feesPaid: number;
  cashInHand: number;
  owes: number;
}

/** A partner as admins see them. */
export interface AdminPartner {
  id: string;
  userCode?: string;
  name: string;
  email: string;
  phone: string;
  vehicle: Vehicle;
  serviceAreas: string[];
  availableToday: boolean;
  isActive: boolean;
  joined: string;
  stats: PartnerStats;
}

export interface PartnerInvite {
  id: string;
  email: string;
  vehicle?: Vehicle;
  serviceAreas: string[];
  invitedBy: string;
  expiresAt: string;
}

export interface PartnerSuggestion {
  partnerId: string;
  name: string;
  phone: string;
  vehicle: Vehicle;
  eligible: boolean;
  score: number;
  blockers: string[];
  notes: string[];
  isCurrent: boolean;
}

export interface PickupPoint {
  shop: string;
  contact: string;
  phone: string;
  location: string;
  items: { name: string; quantity: number; unit: string; size?: string }[];
}

/** A delivery as the partner sees it. */
export interface DeliveryJob {
  id: string;
  status: "pending" | "confirmed" | "packed" | "out-for-delivery" | "delivered" | "cancelled" | "return-requested" | "returned";
  date: string;
  total: number;
  itemsCount: number;
  active: boolean;
  assignedAt?: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cashCollected?: number;
  fee?: number;
  lastProblem?: string;
  attempts: { kind: DeliveryAttempt["kind"]; at: string; reason?: string; fee: number }[];
  customer: { name: string; phone?: string; address?: string; pincode: string; mapsUrl?: string; area?: string };
  pickups?: PickupPoint[];
}

export interface PartnerMe {
  partner: {
    id: string;
    name: string;
    email: string;
    phone: string;
    vehicle: Vehicle;
    serviceAreas: string[];
    availableToday: boolean;
    isActive: boolean;
  } | null;
  stats: {
    active: number;
    deliveredTotal: number;
    successRate: number | null;
    feesEarned: number;
    feesPaid: number;
    unpaidFees: number;
    cashInHand: number;
    owes: number;
  };
  rates: { feePerDelivery: number; extraPickupFee: number };
  failReasons: string[];
}

export const VEHICLE_LABELS: Record<Vehicle, string> = { bike: "Bike", auto: "Auto", van: "Van" };

export const ATTENTION_TEXT: Record<NonNullable<OrderDelivery["needsAttention"]>, string> = {
  declined: "Partner declined",
  "no-response": "Partner didn't accept in time",
  failed: "Delivery attempt failed",
  "cash-mismatch": "Cash collected doesn't match",
};
