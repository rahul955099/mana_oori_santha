function numberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && process.env[name] !== "" && process.env[name] !== undefined ? value : fallback;
}

/** Delivery and order rules. Override with env vars without code changes. */
export const deliveryRules = {
  /** Flat delivery fee for orders below the free-delivery threshold, in rupees. */
  charge: numberFromEnv("DELIVERY_CHARGE", 40),
  /** Orders with a subtotal at or above this ship free. */
  freeAbove: numberFromEnv("FREE_DELIVERY_ABOVE", 500),
  /** Days after delivery during which a customer can request a return. */
  returnWindowDays: numberFromEnv("RETURN_WINDOW_DAYS", 7),
  /** Comma-separated pincode prefixes we deliver to, e.g. "50,51,52,53" for
   * Telangana and Andhra Pradesh. Empty means every valid Indian pincode. */
  serviceablePrefixes: (process.env.SERVICEABLE_PINCODE_PREFIXES ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean),
};

export function isValidPincode(pincode: string): boolean {
  return /^[1-9]\d{5}$/.test(pincode);
}

export function isServiceablePincode(pincode: string): boolean {
  if (!isValidPincode(pincode)) return false;
  const prefixes = deliveryRules.serviceablePrefixes;
  return prefixes.length === 0 || prefixes.some((p) => pincode.startsWith(p));
}

export function deliveryChargeFor(subtotal: number): number {
  return subtotal === 0 || subtotal >= deliveryRules.freeAbove ? 0 : deliveryRules.charge;
}
