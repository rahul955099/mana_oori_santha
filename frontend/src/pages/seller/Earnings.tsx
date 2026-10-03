import { useEffect, useState } from "react";
import { IndianRupee, Wallet, Clock, Landmark } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { Loading } from "@/components/common/Loading";
import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { api, errorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/utils/format";
import type { BadgeTone } from "@/utils/orderStatus";

export type EarningState = "in-progress" | "return-window" | "on-hold" | "settled" | "cancelled" | "returned";

export interface EarningsReport {
  totals: {
    inProgress: number;
    returnWindow: number;
    onHold: number;
    settledGross: number;
    commission: number;
    settledNet: number;
    paidOut: number;
    balance: number;
  };
  orders: {
    orderId: string;
    date: string;
    state: EarningState;
    gross: number;
    commissionRate: number;
    commission: number;
    net: number;
    payableFrom?: string;
  }[];
  payouts: { id: string; amount: number; method: string; reference: string; note?: string; paidAt: string }[];
}

const STATE_LABEL: Record<EarningState, { label: string; tone: BadgeTone }> = {
  "in-progress": { label: "Order in progress", tone: "blue" },
  "return-window": { label: "In return window", tone: "gold" },
  "on-hold": { label: "Return requested", tone: "red" },
  settled: { label: "Settled", tone: "green" },
  cancelled: { label: "Cancelled", tone: "gray" },
  returned: { label: "Returned", tone: "gray" },
};

const PAYOUT_METHOD: Record<string, string> = { upi: "UPI", bank: "Bank transfer", cash: "Cash" };

export default function SellerEarnings() {
  const [report, setReport] = useState<EarningsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<EarningsReport>("/sellers/me/earnings")
      .then(setReport)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <EmptyState title="Couldn't load earnings" description={error} />;
  if (!report) return <Loading label="Loading earnings..." />;

  const { totals } = report;
  const upcoming = totals.inProgress + totals.returnWindow + totals.onHold;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Earnings</h1>
      <p className="mt-1 text-sm text-stone-500">
        You receive the price of your items minus the platform commission. Earnings become payable once the
        customer's return window has closed.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Payable Now" value={formatCurrency(totals.balance)} tone="primary" />
        <StatCard icon={Clock} label="Upcoming" value={formatCurrency(upcoming)} tone="earth" />
        <StatCard icon={Landmark} label="Paid Out" value={formatCurrency(totals.paidOut)} tone="blue" />
        <StatCard icon={IndianRupee} label="Commission (settled)" value={formatCurrency(totals.commission)} tone="accent" />
      </div>

      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-stone-900">Orders</h2>
        {report.orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-400">No sales yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-xs font-bold uppercase text-stone-400">
                  <th className="py-2 pr-4">Order</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4 text-right">Sale</th>
                  <th className="py-2 pr-4 text-right">Commission</th>
                  <th className="py-2 pr-4 text-right">You Earn</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.orders.map((o) => {
                  const counts = o.state !== "cancelled" && o.state !== "returned";
                  return (
                    <tr key={o.orderId} className="border-b border-stone-50">
                      <td className="py-3 pr-4 font-semibold text-stone-800">{o.orderId}</td>
                      <td className="py-3 pr-4 text-stone-500">{formatDate(o.date)}</td>
                      <td className={`py-3 pr-4 text-right ${counts ? "text-stone-700" : "text-stone-400 line-through"}`}>{formatCurrency(o.gross)}</td>
                      <td className="py-3 pr-4 text-right text-stone-500">
                        {counts ? `-${formatCurrency(o.commission)} (${o.commissionRate}%)` : "—"}
                      </td>
                      <td className={`py-3 pr-4 text-right font-bold ${counts ? "text-stone-900" : "text-stone-400"}`}>
                        {counts ? formatCurrency(o.net) : "—"}
                      </td>
                      <td className="py-3">
                        <Badge tone={STATE_LABEL[o.state].tone}>{STATE_LABEL[o.state].label}</Badge>
                        {o.payableFrom && <p className="mt-1 text-[11px] text-stone-400">Payable from {formatDate(o.payableFrom)}</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-stone-900">Payouts Received</h2>
        {report.payouts.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400">No payouts yet. Payable earnings are sent to your UPI or bank account.</p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {report.payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-semibold text-stone-800">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-stone-400">
                    {PAYOUT_METHOD[p.method] ?? p.method} · Ref {p.reference}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                <p className="text-xs text-stone-500">{formatDate(p.paidAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
