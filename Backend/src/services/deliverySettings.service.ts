import { randomInt } from "node:crypto";
import { Settings, DEFAULT_DELIVERY_SETTINGS, type DeliverySettings } from "../models/Settings";

const KEY = "main";

export async function getDeliverySettings(): Promise<DeliverySettings> {
  const doc = await Settings.findOne({ key: KEY }).lean();
  return { ...DEFAULT_DELIVERY_SETTINGS, ...stripUndefined(doc?.delivery ?? {}) };
}

export async function updateDeliverySettings(patch: Partial<DeliverySettings>): Promise<DeliverySettings> {
  const set: Record<string, number> = {};
  for (const key of Object.keys(DEFAULT_DELIVERY_SETTINGS) as (keyof DeliverySettings)[]) {
    if (patch[key] !== undefined) set[`delivery.${key}`] = Number(patch[key]);
  }
  await Settings.updateOne({ key: KEY }, { $set: set }, { upsert: true });
  return getDeliverySettings();
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)) as Partial<T>;
}

/** What a partner earns for delivering an order with this many shop pickups. */
export function deliveryFee(settings: DeliverySettings, pickups: number): number {
  return settings.feePerDelivery + settings.extraPickupFee * Math.max(0, pickups - 1);
}

/** The 4-digit code a customer gives at the door. */
export function newDeliveryCode(): string {
  return String(randomInt(0, 10000)).padStart(4, "0");
}

/** Today's date in India as YYYY-MM-DD (partners' availability is per day). */
export function indiaToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
