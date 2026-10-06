import { useEffect, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { Loading } from "@/components/common/Loading";
import { api, errorMessage } from "@/lib/api";
import { formatCurrency } from "@/utils/format";
import { VEHICLE_LABELS, type PartnerMe } from "@/types/delivery";

/** Delivery partner: what they've earned, been paid, and the cash they hold. */
export default function DeliveryEarnings() {
  const { showToast } = useToast();
  const [me, setMe] = useState<PartnerMe | null>(null);

  useEffect(() => {
    api
      .get<PartnerMe>("/delivery/me")
      .then(setMe)
      .catch((err) => showToast(errorMessage(err), "error"));
  }, [showToast]);

  if (!me) return <Loading label="Loading earnings..." />;
  const s = me.stats;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold text-stone-900">Earnings</h1>
      <p className="mt-1 text-sm text-stone-500">
        You earn {formatCurrency(me.rates.feePerDelivery)} per delivery
        {me.rates.extraPickupFee > 0 ? `, plus ${formatCurrency(me.rates.extraPickupFee)} for each extra shop pickup` : ""}.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Card label="Deliveries completed" value={String(s.deliveredTotal)} />
        <Card label="Success rate (30 days)" value={s.successRate === null ? "—" : `${s.successRate}%`} />
        <Card label="Fees earned" value={formatCurrency(s.feesEarned)} />
        <Card label="Fees paid to you" value={formatCurrency(s.feesPaid)} />
        <Card label="Cash in hand" value={formatCurrency(s.cashInHand)} hint="Collected from customers, not yet handed over" />
        <Card label="Unpaid fees" value={formatCurrency(s.unpaidFees)} />
      </div>

      <div className={`mt-4 rounded-2xl p-5 ${s.owes > 0 ? "bg-accent-50" : "bg-primary-50"}`}>
        <p className="text-sm font-medium text-stone-600">{s.owes > 0 ? "To hand over at the next settlement" : s.owes < 0 ? "The team owes you" : "All settled"}</p>
        <p className="mt-1 text-3xl font-extrabold text-stone-900">{formatCurrency(Math.abs(s.owes))}</p>
        <p className="mt-1 text-xs text-stone-500">Cash in hand minus your unpaid fees.</p>
      </div>

      {me.partner && (
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 text-sm">
          <h2 className="font-bold text-stone-900">Your details</h2>
          <p className="mt-2 text-stone-600">
            {me.partner.name} · {me.partner.phone} · {VEHICLE_LABELS[me.partner.vehicle]}
          </p>
          <p className="mt-1 text-stone-500">Areas: {me.partner.serviceAreas.length ? me.partner.serviceAreas.join(", ") : "none set yet"}</p>
          <p className="mt-2 text-xs text-stone-400">To change your vehicle or areas, contact the team.</p>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p className="text-xl font-extrabold text-stone-900">{value}</p>
      <p className="text-xs font-medium text-stone-500">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-stone-400">{hint}</p>}
    </div>
  );
}
