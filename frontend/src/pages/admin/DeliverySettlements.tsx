import { useCallback, useEffect, useState, type FormEvent } from "react";
import { HandCoins, Settings2 } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { Loading } from "@/components/common/Loading";
import { Modal } from "@/components/common/Modal";
import { buttonClasses } from "@/components/common/Button";
import { api, errorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/utils/format";
import type { AdminPartner, DeliverySettings } from "@/types/delivery";

const inputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";
const labelClass = "mb-1.5 block text-xs font-bold text-stone-600";

interface Entry {
  id: string;
  partnerName: string;
  kind: "cash-received" | "fee-paid";
  amount: number;
  method: string;
  reference?: string;
  note?: string;
  at: string;
  recordedBy: string;
}

/** Owner: delivery fees and limits, what each partner holds and is owed, and settling up. */
export default function AdminDeliverySettlements() {
  const { showToast } = useToast();
  const [partners, setPartners] = useState<AdminPartner[] | null>(null);
  const [history, setHistory] = useState<Entry[]>([]);
  const [settings, setSettings] = useState<DeliverySettings | null>(null);
  const [settling, setSettling] = useState<AdminPartner | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, cfg] = await Promise.all([
        api.get<{ partners: AdminPartner[]; history: Entry[] }>("/admin/delivery/settlements"),
        api.get<{ settings: DeliverySettings }>("/admin/delivery/settings"),
      ]);
      setPartners(s.partners);
      setHistory(s.history);
      setSettings(cfg.settings);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!partners || !settings) return <Loading label="Loading settlements..." />;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Delivery Settlements</h1>
      <p className="mt-1 text-sm text-stone-500">
        Partners keep the cash they collect until they hand it over. Record each handover here, and any fees you pay them (or let them keep
        from the cash).
      </p>

      <SettingsForm settings={settings} onSaved={setSettings} />

      <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50">
              <tr className="text-xs font-bold uppercase text-stone-400">
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Cash collected</th>
                <th className="px-4 py-3">Cash in hand</th>
                <th className="px-4 py-3">Fees earned</th>
                <th className="px-4 py-3">Unpaid fees</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {partners.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-stone-400">No delivery partners yet.</td>
                </tr>
              )}
              {partners.map((p) => {
                const unpaid = Math.max(0, p.stats.feesEarned - p.stats.feesPaid);
                return (
                  <tr key={p.id} className="border-t border-stone-100">
                    <td className="px-4 py-3 font-semibold text-stone-800">{p.name}</td>
                    <td className="px-4 py-3 text-stone-600">{formatCurrency(p.stats.cashCollected)}</td>
                    <td className="px-4 py-3 font-semibold text-stone-800">{formatCurrency(p.stats.cashInHand)}</td>
                    <td className="px-4 py-3 text-stone-600">{formatCurrency(p.stats.feesEarned)}</td>
                    <td className="px-4 py-3 text-stone-600">{formatCurrency(unpaid)}</td>
                    <td className="px-4 py-3">
                      {p.stats.owes > 0 ? (
                        <span className="font-semibold text-accent-700">Owes you {formatCurrency(p.stats.owes)}</span>
                      ) : p.stats.owes < 0 ? (
                        <span className="font-semibold text-primary-700">You owe {formatCurrency(-p.stats.owes)}</span>
                      ) : (
                        <span className="text-stone-400">Settled</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSettling(p)}
                        disabled={p.stats.cashInHand <= 0 && unpaid <= 0}
                        className={buttonClasses("ghost", "sm")}
                      >
                        <HandCoins size={14} /> Settle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="mb-3 font-bold text-stone-900">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-stone-400">Nothing recorded yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                <span className="text-stone-700">
                  <span className="font-semibold">{h.partnerName}</span>{" "}
                  {h.kind === "cash-received" ? "handed over" : "was paid fees of"} {formatCurrency(h.amount)} by {h.method}
                  {h.reference ? ` (${h.reference})` : ""}
                  {h.note ? ` · ${h.note}` : ""}
                </span>
                <span className="text-xs text-stone-400">
                  {formatDate(h.at)} · {h.recordedBy}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {settling && <SettleModal partner={settling} onClose={() => setSettling(null)} onSaved={load} />}
    </div>
  );
}

function SettingsForm({ settings, onSaved }: { settings: DeliverySettings; onSaved: (s: DeliverySettings) => void }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const field = (key: keyof DeliverySettings, label: string, hint: string) => (
    <div>
      <label htmlFor={`s-${key}`} className={labelClass}>{label}</label>
      <input
        id={`s-${key}`}
        type="number"
        min={0}
        required
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
        className={inputClass}
      />
      <p className="mt-1 text-[11px] text-stone-400">{hint}</p>
    </div>
  );

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { settings: saved } = await api.put<{ settings: DeliverySettings }>("/admin/delivery/settings", form);
      onSaved(saved);
      showToast("Delivery settings saved.");
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="mb-4 flex items-center gap-2 font-bold text-stone-900">
        <Settings2 size={18} className="text-primary-600" /> Fees and limits
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {field("feePerDelivery", "Fee per delivery (₹)", "Paid for each delivered order")}
        {field("extraPickupFee", "Extra shop pickup (₹)", "For each shop after the first")}
        {field("maxActiveDeliveries", "Max active deliveries", "Per partner at a time")}
        {field("cashLimit", "Cash limit (₹)", "No new jobs above this much cash")}
        {field("acceptWithinMinutes", "Accept within (minutes)", "Then the order goes back to unassigned")}
      </div>
      <button type="submit" disabled={saving} className={`${buttonClasses("primary", "sm")} mt-4`}>
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}

function SettleModal({ partner, onClose, onSaved }: { partner: AdminPartner; onClose: () => void; onSaved: () => Promise<void> }) {
  const { showToast } = useToast();
  const unpaid = Math.max(0, Math.round((partner.stats.feesEarned - partner.stats.feesPaid) * 100) / 100);
  const [cash, setCash] = useState(String(partner.stats.cashInHand));
  const [fees, setFees] = useState(String(unpaid));
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/admin/delivery/settlements", {
        partnerId: partner.id,
        cashReceived: Number(cash) || 0,
        feesPaid: Number(fees) || 0,
        method,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      });
      showToast(`Settlement recorded for ${partner.name}.`);
      onClose();
      await onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  const handOver = Math.max(0, (Number(cash) || 0) - (Number(fees) || 0));

  return (
    <Modal isOpen onClose={onClose} title={`Settle with ${partner.name}`}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="st-cash" className={labelClass}>Cash received (₹)</label>
            <input id="st-cash" type="number" min={0} max={partner.stats.cashInHand} step="0.01" value={cash} onChange={(e) => setCash(e.target.value)} className={inputClass} />
            <p className="mt-1 text-[11px] text-stone-400">They hold {formatCurrency(partner.stats.cashInHand)}</p>
          </div>
          <div>
            <label htmlFor="st-fees" className={labelClass}>Fees paid / kept (₹)</label>
            <input id="st-fees" type="number" min={0} max={unpaid} step="0.01" value={fees} onChange={(e) => setFees(e.target.value)} className={inputClass} />
            <p className="mt-1 text-[11px] text-stone-400">Unpaid: {formatCurrency(unpaid)}</p>
          </div>
        </div>
        <p className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
          If they keep their fees from the cash, they hand over <span className="font-bold text-stone-900">{formatCurrency(handOver)}</span>.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="st-method" className={labelClass}>How</label>
            <select id="st-method" value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank transfer</option>
            </select>
          </div>
          <div>
            <label htmlFor="st-ref" className={labelClass}>Reference (optional)</label>
            <input id="st-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / receipt no." className={inputClass} />
          </div>
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className={inputClass} />
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className={buttonClasses("ghost", "sm")}>Cancel</button>
          <button type="submit" disabled={saving} className={buttonClasses("primary", "sm")}>{saving ? "Saving..." : "Record Settlement"}</button>
        </div>
      </form>
    </Modal>
  );
}
