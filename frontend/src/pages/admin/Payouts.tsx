import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Wallet } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/common/Modal";
import { Loading } from "@/components/common/Loading";
import { StatCard } from "@/components/common/StatCard";
import { buttonClasses } from "@/components/common/Button";
import { api, errorMessage } from "@/lib/api";
import { formatCurrency } from "@/utils/format";
import type { PayoutDetails, SellerStatus } from "@/types";

interface Balance {
  sellerId: string;
  farmName: string;
  name: string;
  status: SellerStatus;
  payout: PayoutDetails | null;
  inProgress: number;
  returnWindow: number;
  onHold: number;
  settledNet: number;
  commission: number;
  paidOut: number;
  balance: number;
}

const inputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

function payoutTarget(p: PayoutDetails | null) {
  if (!p) return "No payout details";
  return p.method === "upi" ? `UPI · ${p.upiId}` : `${p.accountHolder} · ${p.accountNumber} · ${p.ifsc}`;
}

/** Admin: see what each seller is owed and record payments made to them. */
export default function AdminPayouts() {
  const { showToast } = useToast();
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [target, setTarget] = useState<Balance | null>(null);
  const [form, setForm] = useState({ amount: "", method: "upi", reference: "", note: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setBalances((await api.get<{ balances: Balance[] }>("/payouts/balances")).balances);
    } catch (err) {
      showToast(errorMessage(err), "error");
      setBalances([]);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  function openPayout(row: Balance) {
    setTarget(row);
    setForm({ amount: String(row.balance), method: row.payout?.method ?? "upi", reference: "", note: "" });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!target) return;
    setBusy(true);
    try {
      await api.post("/payouts", {
        sellerId: target.sellerId,
        amount: Number(form.amount),
        method: form.method,
        reference: form.reference,
        note: form.note || undefined,
      });
      showToast(`Payout of ${formatCurrency(Number(form.amount))} recorded for ${target.farmName}`);
      setTarget(null);
      await load();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  if (!balances) return <Loading label="Loading balances..." />;

  const owed = balances.reduce((s, b) => s + Math.max(0, b.balance), 0);
  const paid = balances.reduce((s, b) => s + b.paidOut, 0);
  const commission = balances.reduce((s, b) => s + b.commission, 0);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Seller Payouts</h1>
      <p className="mt-1 text-sm text-stone-500">
        Pay sellers by UPI or bank transfer, then record the payment here with its UTR / reference. Only earnings whose
        return window has closed are payable.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Wallet} label="Owed to Sellers" value={formatCurrency(owed)} tone="earth" />
        <StatCard icon={Wallet} label="Paid Out" value={formatCurrency(paid)} tone="blue" />
        <StatCard icon={Wallet} label="Commission Earned" value={formatCurrency(commission)} tone="primary" />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50">
              <tr className="text-xs font-bold uppercase text-stone-400">
                <th className="px-5 py-3">Seller</th>
                <th className="px-5 py-3">Pay To</th>
                <th className="px-5 py-3 text-right">Upcoming</th>
                <th className="px-5 py-3 text-right">Paid</th>
                <th className="px-5 py-3 text-right">Payable</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => (
                <tr key={b.sellerId} className="border-t border-stone-100">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-stone-800">{b.farmName}</p>
                    <p className="text-xs text-stone-400">{b.name}</p>
                  </td>
                  <td className="px-5 py-3 text-xs text-stone-500">{payoutTarget(b.payout)}</td>
                  <td className="px-5 py-3 text-right text-stone-500">{formatCurrency(b.inProgress + b.returnWindow + b.onHold)}</td>
                  <td className="px-5 py-3 text-right text-stone-500">{formatCurrency(b.paidOut)}</td>
                  <td className={`px-5 py-3 text-right font-bold ${b.balance < 0 ? "text-red-600" : "text-stone-900"}`}>
                    {formatCurrency(b.balance)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      disabled={b.balance <= 0}
                      onClick={() => openPayout(b)}
                      className={buttonClasses("primary", "sm", "disabled:opacity-40")}
                    >
                      Record Payout
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {balances.length === 0 && <p className="py-10 text-center text-sm text-stone-400">No sellers yet.</p>}
        </div>
      </div>

      <Modal isOpen={!!target} onClose={() => setTarget(null)} title={target ? `Pay ${target.farmName}` : ""}>
        {target && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="rounded-xl bg-stone-50 p-3 text-xs text-stone-600">
              Payable: <strong>{formatCurrency(target.balance)}</strong> · {payoutTarget(target.payout)}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <input
                required
                type="number"
                min={1}
                max={target.balance}
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="Amount (₹)"
                className={inputClass}
              />
              <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className={inputClass}>
                <option value="upi">UPI</option>
                <option value="bank">Bank transfer</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <input
              required
              minLength={3}
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="UTR / transaction reference"
              className={inputClass}
            />
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Note (optional), e.g. September settlement"
              className={inputClass}
            />
            <p className="text-xs text-stone-500">
              Record this only after the money has been sent. Recorded payouts are shown to the seller.
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setTarget(null)} className={buttonClasses("ghost", "sm")}>
                Cancel
              </button>
              <button type="submit" disabled={busy} className={buttonClasses("primary", "sm")}>
                Record Payout
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
