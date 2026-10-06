import { useEffect, useState } from "react";
import { CheckCircle2, Phone } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/common/Modal";
import { Badge } from "@/components/common/Badge";
import { Loading } from "@/components/common/Loading";
import { buttonClasses } from "@/components/common/Button";
import { api, errorMessage } from "@/lib/api";
import { VEHICLE_LABELS, type PartnerSuggestion } from "@/types/delivery";
import type { Order } from "@/types";

/** Ranked delivery partners for one order (or a batch, ranked for the first),
 * with the reasons. Partners who fail the rules are hidden unless asked for. */
export function AssignPartnerModal({ orders, onClose, onAssigned }: { orders: Order[]; onClose: () => void; onAssigned: () => Promise<void> }) {
  const { showToast } = useToast();
  const [suggestions, setSuggestions] = useState<PartnerSuggestion[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const first = orders[0];

  useEffect(() => {
    api
      .get<{ suggestions: PartnerSuggestion[] }>(`/admin/delivery/orders/${first.id}/suggestions`)
      .then((r) => setSuggestions(r.suggestions))
      .catch((err) => {
        showToast(errorMessage(err), "error");
        setSuggestions([]);
      });
  }, [first.id, showToast]);

  async function assign(s: PartnerSuggestion) {
    if (!s.eligible && !window.confirm(`${s.name}: ${s.blockers.join(", ")}. Assign anyway?`)) return;
    setSaving(true);
    try {
      await api.post("/admin/delivery/assign", { orderNumbers: orders.map((o) => o.id), partnerId: s.partnerId });
      showToast(orders.length === 1 ? `${first.id} assigned to ${s.name}.` : `${orders.length} orders assigned to ${s.name}.`);
      await onAssigned();
    } catch (err) {
      showToast(errorMessage(err), "error");
      setSaving(false);
    }
  }

  const eligible = suggestions?.filter((s) => s.eligible) ?? [];
  const others = suggestions?.filter((s) => !s.eligible) ?? [];
  const pincodes = [...new Set(orders.map((o) => o.customer.pincode))];

  return (
    <Modal isOpen onClose={onClose} title={orders.length === 1 ? `Assign ${first.id}` : `Assign ${orders.length} orders`}>
      <p className="mb-4 text-sm text-stone-500">
        Deliver to {pincodes.join(", ")}
        {orders.length > 1 && pincodes.length > 1 ? " (different areas: ranked for the first order)" : ""}. Best match first.
      </p>
      {!suggestions ? (
        <Loading label="Finding partners..." />
      ) : (
        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {eligible.length === 0 && (
            <p className="rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-800">
              No partner meets all the rules right now (available today, covers the area, under the job and cash limits).
            </p>
          )}
          {eligible.map((s, i) => (
            <PartnerRow key={s.partnerId} s={s} best={i === 0} disabled={saving} onAssign={() => assign(s)} />
          ))}
          {others.length > 0 && (
            <button onClick={() => setShowAll((v) => !v)} className="text-xs font-semibold text-primary-700 hover:underline">
              {showAll ? "Hide" : "Show"} {others.length} partner{others.length === 1 ? "" : "s"} who don't meet the rules
            </button>
          )}
          {showAll && others.map((s) => <PartnerRow key={s.partnerId} s={s} best={false} disabled={saving} onAssign={() => assign(s)} />)}
        </div>
      )}
    </Modal>
  );
}

function PartnerRow({ s, best, disabled, onAssign }: { s: PartnerSuggestion; best: boolean; disabled: boolean; onAssign: () => void }) {
  return (
    <div className={`rounded-xl border p-4 ${best ? "border-primary-300 bg-primary-50/50" : "border-stone-200"} ${s.eligible ? "" : "opacity-75"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-stone-800">
            {s.name}
            {best && <Badge tone="green">Best match</Badge>}
            {s.isCurrent && <Badge tone="blue">Assigned now</Badge>}
          </p>
          <p className="flex items-center gap-1 text-xs text-stone-400">
            <Phone size={11} /> {s.phone} · {VEHICLE_LABELS[s.vehicle]}
          </p>
        </div>
        <button onClick={onAssign} disabled={disabled || s.isCurrent} className={buttonClasses(s.eligible ? "primary" : "ghost", "sm")}>
          {s.eligible ? "Assign" : "Assign anyway"}
        </button>
      </div>
      <ul className="mt-2 space-y-0.5 text-xs">
        {s.blockers.map((b) => (
          <li key={b} className="font-medium text-red-600">✕ {b}</li>
        ))}
        {s.notes.map((n) => (
          <li key={n} className="flex items-center gap-1 text-stone-500">
            <CheckCircle2 size={11} className="text-stone-300" /> {n}
          </li>
        ))}
      </ul>
    </div>
  );
}
