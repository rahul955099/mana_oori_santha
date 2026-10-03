import { getToken } from "@/lib/api";
import type { DailyPoint } from "@/components/reports/DailyRevenueChart";
import type { OrderStatus } from "@/types";

export interface SalesReport {
  range: { from: string; to: string };
  totals: {
    orders: number;
    revenue: number;
    itemSales: number;
    averageOrderValue: number;
    discounts: number;
    deliveryFees: number;
    commission: number;
    buyers: number;
    newCustomers: number;
    cancelled: number;
    returned: number;
  };
  byStatus: Partial<Record<OrderStatus, number>>;
  daily: DailyPoint[];
  byCategory: { category: string; revenue: number; units: number }[];
  topProducts: { productId: string; name: string; revenue: number; units: number }[];
  bySeller: { sellerId: string; farmName: string; revenue: number; units: number; orders: number }[];
  snapshot: {
    customers: number;
    approvedSellers: number;
    pendingSellers: number;
    liveProducts: number;
    outOfStock: number;
    openOrders: number;
    returnRequests: number;
    openTickets: number;
  };
}

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:5000/api";

/** Downloads the orders CSV. Uses fetch (not a plain link) so the login token is sent. */
export async function downloadOrdersCsv(from: string, to: string) {
  const res = await fetch(`${API_URL}/admin/reports/orders.csv?from=${from}&to=${to}`, {
    headers: { Authorization: `Bearer ${getToken() ?? ""}` },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Couldn't export orders.");
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders-${from}-to-${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** YYYY-MM-DD for a date `daysAgo` days before today, in the browser's timezone. */
export function isoDaysAgo(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
