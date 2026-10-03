import type { Types } from "mongoose";
import { Order, type OrderDocument } from "../models/Order";
import { Payout } from "../models/Payout";
import { deliveryRules } from "../config/delivery";

/** Where a seller's share of an order stands in the payout cycle. */
export type EarningState =
  | "in-progress" // placed but not yet delivered
  | "return-window" // delivered, but the customer can still ask for a return
  | "on-hold" // a return was requested and is being reviewed
  | "settled" // delivered and the return window has closed: payable
  | "cancelled"
  | "returned";

const DAY_MS = 24 * 60 * 60 * 1000;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function stateOf(order: OrderDocument, now: number): EarningState {
  switch (order.status) {
    case "cancelled":
      return "cancelled";
    case "returned":
      return "returned";
    case "return-requested":
      return "on-hold";
    case "delivered": {
      const deliveredAt = (order.deliveredAt ?? order.updatedAt).getTime();
      return now > deliveredAt + deliveryRules.returnWindowDays * DAY_MS ? "settled" : "return-window";
    }
    default:
      return "in-progress";
  }
}

/** A seller earns the full price of their items minus the platform
 * commission. Coupon discounts and delivery charges are the platform's. */
export async function sellerEarnings(sellerId: Types.ObjectId) {
  const now = Date.now();
  const [orders, payouts] = await Promise.all([
    Order.find({ "items.seller": sellerId }).sort({ createdAt: -1 }),
    Payout.find({ seller: sellerId }).sort({ paidAt: -1 }),
  ]);

  const totals = { inProgress: 0, returnWindow: 0, onHold: 0, settledGross: 0, commission: 0, settledNet: 0 };
  const lines = orders.map((order) => {
    const gross = order.items
      .filter((i) => i.seller.equals(sellerId))
      .reduce((sum, i) => sum + i.price * i.quantity, 0);
    const rate = order.commissionRate ?? 5;
    const commission = round2((gross * rate) / 100);
    const net = round2(gross - commission);
    const state = stateOf(order, now);

    if (state === "in-progress") totals.inProgress += net;
    if (state === "return-window") totals.returnWindow += net;
    if (state === "on-hold") totals.onHold += net;
    if (state === "settled") {
      totals.settledGross += gross;
      totals.commission += commission;
      totals.settledNet += net;
    }

    return {
      orderId: order.orderNumber,
      date: order.createdAt,
      status: order.status,
      state,
      gross,
      commissionRate: rate,
      commission,
      net,
      payableFrom:
        state === "return-window" && order.deliveredAt
          ? new Date(order.deliveredAt.getTime() + deliveryRules.returnWindowDays * DAY_MS)
          : undefined,
    };
  });

  const paidOut = payouts.reduce((sum, p) => sum + p.amount, 0);
  return {
    totals: {
      inProgress: round2(totals.inProgress),
      returnWindow: round2(totals.returnWindow),
      onHold: round2(totals.onHold),
      settledGross: round2(totals.settledGross),
      commission: round2(totals.commission),
      settledNet: round2(totals.settledNet),
      paidOut: round2(paidOut),
      /** What the platform currently owes this seller. */
      balance: round2(totals.settledNet - paidOut),
    },
    orders: lines,
    payouts: payouts.map((p) => ({
      id: p._id.toString(),
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      note: p.note,
      paidAt: p.paidAt,
    })),
  };
}
