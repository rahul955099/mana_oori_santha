import type { PipelineStage } from "mongoose";
import { Order } from "../models/Order";
import { User } from "../models/User";
import { Seller } from "../models/Seller";
import { Product } from "../models/Product";
import { SupportTicket } from "../models/SupportTicket";
import { AppError } from "../utils/AppError";
import { sellableSellerIds } from "./sellerAccess.service";

/** Reports use Indian Standard Time so "a day" matches the business day. */
const TZ = "Asia/Kolkata";
const IST_OFFSET = "+05:30";
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 366;

/** Orders that count towards sales (not cancelled or returned). */
const NOT_COUNTED = ["cancelled", "returned"];

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;
  start: Date;
  end: Date;
}

function istDate(d: Date): string {
  return new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Parses ?from=&to= (inclusive, IST). Defaults to the last 30 days. */
export function parseRange(from?: string, to?: string): DateRange {
  const today = istDate(new Date());
  const toDay = to ?? today;
  const fromDay = from ?? istDate(new Date(Date.now() - 29 * DAY_MS));
  const start = new Date(`${fromDay}T00:00:00.000${IST_OFFSET}`);
  const end = new Date(`${toDay}T23:59:59.999${IST_OFFSET}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw new AppError("Choose a valid date range.", 400, "VALIDATION_ERROR");
  }
  if (end.getTime() - start.getTime() > MAX_DAYS * DAY_MS) {
    throw new AppError(`Reports can cover up to ${MAX_DAYS} days at a time.`, 400, "VALIDATION_ERROR");
  }
  return { from: fromDay, to: toDay, start, end };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function salesSummary(range: DateRange) {
  const inRange = { createdAt: { $gte: range.start, $lte: range.end } };
  const counted = { ...inRange, status: { $nin: NOT_COUNTED } };
  const itemsPipeline: PipelineStage[] = [{ $match: counted }, { $unwind: "$items" }];
  const lineRevenue = { $multiply: ["$items.price", "$items.quantity"] };

  const [totalsRow, byStatus, daily, byCategory, topProducts, bySellerRaw, newCustomers] = await Promise.all([
    Order.aggregate([
      { $match: counted },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: "$total" },
          itemSales: { $sum: "$subtotal" },
          discounts: { $sum: "$discount" },
          deliveryFees: { $sum: "$deliveryCharge" },
          commission: { $sum: { $multiply: ["$subtotal", { $divide: [{ $ifNull: ["$commissionRate", 5] }, 100] }] } },
          customers: { $addToSet: "$user" },
        },
      },
    ]),
    Order.aggregate<{ _id: string; count: number }>([{ $match: inRange }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate<{ _id: string; orders: number; revenue: number }>([
      { $match: counted },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
          orders: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
    ]),
    Order.aggregate<{ _id: string; revenue: number; units: number }>([
      ...itemsPipeline,
      { $group: { _id: "$items.category", revenue: { $sum: lineRevenue }, units: { $sum: "$items.quantity" } } },
      { $sort: { revenue: -1 } },
    ]),
    Order.aggregate<{ _id: string; name: string; revenue: number; units: number }>([
      ...itemsPipeline,
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.name" },
          revenue: { $sum: lineRevenue },
          units: { $sum: "$items.quantity" },
        },
      },
      { $sort: { units: -1, revenue: -1 } },
      { $limit: 10 },
    ]),
    Order.aggregate<{ _id: string; revenue: number; units: number; orders: string[] }>([
      ...itemsPipeline,
      {
        $group: {
          _id: "$items.seller",
          revenue: { $sum: lineRevenue },
          units: { $sum: "$items.quantity" },
          orders: { $addToSet: "$_id" },
        },
      },
      { $sort: { revenue: -1 } },
    ]),
    User.countDocuments({ role: "customer", createdAt: { $gte: range.start, $lte: range.end } }),
  ]);

  const sellers = await Seller.find({ _id: { $in: bySellerRaw.map((s) => s._id) } }).select("farmName");
  const sellerNames = new Map(sellers.map((s) => [s._id.toString(), s.farmName]));

  // Every day in the range, including days with no sales, so charts have no gaps.
  const dailyMap = new Map(daily.map((d) => [d._id, d]));
  const days: { date: string; orders: number; revenue: number }[] = [];
  for (let t = range.start.getTime(); t <= range.end.getTime(); t += DAY_MS) {
    const date = istDate(new Date(t));
    const d = dailyMap.get(date);
    days.push({ date, orders: d?.orders ?? 0, revenue: round2(d?.revenue ?? 0) });
  }

  const t = totalsRow[0];
  const statusCounts = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
  return {
    range: { from: range.from, to: range.to },
    totals: {
      orders: t?.orders ?? 0,
      revenue: round2(t?.revenue ?? 0),
      itemSales: round2(t?.itemSales ?? 0),
      averageOrderValue: t?.orders ? round2(t.revenue / t.orders) : 0,
      discounts: round2(t?.discounts ?? 0),
      deliveryFees: round2(t?.deliveryFees ?? 0),
      commission: round2(t?.commission ?? 0),
      buyers: t?.customers.length ?? 0,
      newCustomers,
      cancelled: statusCounts.cancelled ?? 0,
      returned: statusCounts.returned ?? 0,
    },
    byStatus: statusCounts,
    daily: days,
    byCategory: byCategory.map((c) => ({ category: c._id, revenue: round2(c.revenue), units: c.units })),
    topProducts: topProducts.map((p) => ({ productId: String(p._id), name: p.name, revenue: round2(p.revenue), units: p.units })),
    bySeller: bySellerRaw.map((s) => ({
      sellerId: String(s._id),
      farmName: sellerNames.get(String(s._id)) ?? "Removed seller",
      revenue: round2(s.revenue),
      units: s.units,
      orders: s.orders.length,
    })),
  };
}

/** Live counts for the admin dashboard (not limited to a date range). */
export async function platformSnapshot() {
  const sellable = await sellableSellerIds();
  const [customers, approvedSellers, pendingSellers, liveProducts, outOfStock, openOrders, returnRequests, openTickets] =
    await Promise.all([
      User.countDocuments({ role: "customer", isActive: true }),
      Seller.countDocuments({ isActive: true, status: "approved" }),
      Seller.countDocuments({ isActive: true, status: "pending" }),
      Product.countDocuments({ isActive: true, seller: { $in: sellable } }),
      Product.countDocuments({ isActive: true, seller: { $in: sellable }, stock: 0 }),
      Order.countDocuments({ status: { $in: ["pending", "confirmed", "packed", "out-for-delivery"] } }),
      Order.countDocuments({ status: "return-requested" }),
      SupportTicket.countDocuments({ status: { $ne: "resolved" } }),
    ]);
  return { customers, approvedSellers, pendingSellers, liveProducts, outOfStock, openOrders, returnRequests, openTickets };
}

/** Neutralises spreadsheet formulas (e.g. a name starting with "=") and quotes as needed. */
export function csvCell(value: unknown): string {
  let s = value === undefined || value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One row per order item, for spreadsheets and accounting. */
export async function ordersCsv(range: DateRange): Promise<string> {
  const orders = await Order.find({ createdAt: { $gte: range.start, $lte: range.end } })
    .sort({ createdAt: 1 })
    .populate("items.seller", "farmName");
  const header = [
    "Order Number",
    "Order Date (IST)",
    "Status",
    "Payment Status",
    "Customer",
    "Phone",
    "Pincode",
    "Product",
    "Seller",
    "Category",
    "Unit",
    "Quantity",
    "Unit Price",
    "Line Total",
    "Order Subtotal",
    "Order Discount",
    "Coupon",
    "Delivery Charge",
    "Order Total",
  ];
  const rows = [header.map(csvCell).join(",")];
  for (const o of orders) {
    for (const item of o.items) {
      const seller = item.seller as unknown as { farmName?: string };
      rows.push(
        [
          o.orderNumber,
          new Date(o.createdAt.getTime() + 5.5 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 16),
          o.status,
          o.paymentStatus,
          o.shippingAddress.fullName,
          o.shippingAddress.mobile,
          o.shippingAddress.pincode,
          item.name,
          seller?.farmName ?? "",
          item.category,
          item.unit,
          item.quantity,
          item.price,
          item.price * item.quantity,
          o.subtotal,
          o.discount,
          o.couponCode ?? "",
          o.deliveryCharge,
          o.total,
        ]
          .map(csvCell)
          .join(",")
      );
    }
  }
  // Byte-order mark so Excel reads the file as UTF-8 (e.g. names in Telugu).
  return "﻿" + rows.join("\r\n") + "\r\n";
}
