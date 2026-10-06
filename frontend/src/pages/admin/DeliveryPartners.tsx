import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Truck, Mail, RotateCw, X, Pencil, Ban, CheckCircle2 } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { Loading } from "@/components/common/Loading";
import { Modal } from "@/components/common/Modal";
import { Badge } from "@/components/common/Badge";
import { buttonClasses } from "@/components/common/Button";
import { api, errorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/utils/format";
import { VEHICLE_LABELS, type AdminPartner, type DeliverySettings, type PartnerInvite, type Vehicle } from "@/types/delivery";

const inputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";
const labelClass = "mb-1.5 block text-xs font-bold text-stone-600";
const VEHICLES: Vehicle[] = ["bike", "auto", "van"];

interface PartnersData {
  partners: AdminPartner[];
  invites: PartnerInvite[];
  settings: DeliverySettings;
}

/** Admin: invite, edit and pause delivery partners; see their workload and cash. */
export default function AdminDeliveryPartners() {
  const { showToast } = useToast();
  const [data, setData] = useState<PartnersData | null>(null);
  const [form, setForm] = useState({ email: "", vehicle: "bike" as Vehicle, areas: "" });
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState<AdminPartner | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.get<PartnersData>("/admin/delivery/partners"));
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/admin/delivery/partners/invite", { email: form.email.trim(), vehicle: form.vehicle, serviceAreas: form.areas });
      showToast(`Invitation sent to ${form.email.trim()}.`);
      setForm({ email: "", vehicle: "bike", areas: "" });
      await load();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setSending(false);
    }
  }

  async function inviteAction(i: PartnerInvite, action: "resend" | "cancel") {
    try {
      if (action === "resend") await api.post(`/admin/delivery/invites/${i.id}/resend`);
      else await api.delete(`/admin/delivery/invites/${i.id}`);
      showToast(action === "resend" ? `Invitation re-sent to ${i.email}.` : `Invitation to ${i.email} cancelled.`);
      await load();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  async function setActive(p: AdminPartner, isActive: boolean) {
    if (!isActive && !window.confirm(`Pause ${p.name}? They won't be given new deliveries until you unpause them.`)) return;
    try {
      await api.patch(`/admin/delivery/partners/${p.id}`, { isActive });
      showToast(isActive ? `${p.name} can take deliveries again.` : `${p.name} is paused.`);
      await load();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  if (!data) return <Loading label="Loading delivery partners..." />;
  const { settings } = data;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Delivery Partners</h1>
      <p className="mt-1 text-sm text-stone-500">
        People who pick up from shops and deliver to customers. Partners earn {formatCurrency(settings.feePerDelivery)} per delivery (+
        {formatCurrency(settings.extraPickupFee)} per extra shop). New deliveries go only to partners who are available today, cover the
        pincode, have fewer than {settings.maxActiveDeliveries} active jobs and hold under {formatCurrency(settings.cashLimit)} of cash.
      </p>

      <form onSubmit={invite} className="mt-6 grid gap-3 rounded-2xl border border-stone-200 bg-white p-5 md:grid-cols-[1.5fr_0.8fr_1.5fr_auto] md:items-end">
        <div>
          <label htmlFor="p-email" className={labelClass}>Email</label>
          <input id="p-email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" className={inputClass} />
        </div>
        <div>
          <label htmlFor="p-vehicle" className={labelClass}>Vehicle</label>
          <select id="p-vehicle" value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value as Vehicle })} className={inputClass}>
            {VEHICLES.map((v) => (
              <option key={v} value={v}>{VEHICLE_LABELS[v]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="p-areas" className={labelClass}>Pincodes they cover</label>
          <input id="p-areas" value={form.areas} onChange={(e) => setForm({ ...form, areas: e.target.value })} placeholder="500079, 500074, 500035" className={inputClass} />
        </div>
        <button type="submit" disabled={sending} className={buttonClasses("primary", "md")}>
          <Mail size={16} /> {sending ? "Sending..." : "Send Invitation"}
        </button>
      </form>
      <p className="mt-2 text-xs text-stone-400">They get an email to set up their own login. Use an email that isn't already a customer or seller account.</p>

      {data.invites.length > 0 && (
        <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="mb-3 font-bold text-stone-900">Pending invitations ({data.invites.length})</h2>
          <ul className="divide-y divide-stone-100">
            {data.invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-stone-800">{i.email}</p>
                  <p className="text-xs text-stone-400">
                    {i.vehicle ? VEHICLE_LABELS[i.vehicle] : ""} · {i.serviceAreas.join(", ") || "no areas yet"} · expires {formatDate(i.expiresAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => inviteAction(i, "resend")} aria-label={`Resend invitation to ${i.email}`} title="Resend" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-primary-50 hover:text-primary-700">
                    <RotateCw size={15} />
                  </button>
                  <button onClick={() => inviteAction(i, "cancel")} aria-label={`Cancel invitation to ${i.email}`} title="Cancel" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-red-50 hover:text-red-600">
                    <X size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50">
              <tr className="text-xs font-bold uppercase text-stone-400">
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Vehicle · Areas</th>
                <th className="px-4 py-3">Today</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Delivered</th>
                <th className="px-4 py-3">Cash in hand</th>
                <th className="px-4 py-3">Fees earned</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.partners.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-stone-400">
                    <Truck className="mx-auto mb-2 text-stone-300" /> No delivery partners yet. Invite your first one above.
                  </td>
                </tr>
              )}
              {data.partners.map((p) => (
                <tr key={p.id} className="border-t border-stone-100 align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-stone-800">{p.name}</p>
                    <p className="text-xs text-stone-400">{p.phone} · {p.email}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {VEHICLE_LABELS[p.vehicle]}
                    <p className="max-w-48 text-xs text-stone-400">{p.serviceAreas.join(", ") || "No areas"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {!p.isActive ? <Badge tone="red">Paused</Badge> : p.availableToday ? <Badge tone="green">Available</Badge> : <Badge tone="gray">Off</Badge>}
                  </td>
                  <td className="px-4 py-3 text-stone-700">{p.stats.active}</td>
                  <td className="px-4 py-3 text-stone-700">
                    {p.stats.deliveredTotal}
                    <p className="text-xs text-stone-400">{p.stats.successRate === null ? "new" : `${p.stats.successRate}% (30d)`}</p>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${p.stats.cashInHand > settings.cashLimit ? "text-red-600" : "text-stone-800"}`}>
                    {formatCurrency(p.stats.cashInHand)}
                  </td>
                  <td className="px-4 py-3 text-stone-700">{formatCurrency(p.stats.feesEarned)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`} title="Edit vehicle and areas" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-primary-50 hover:text-primary-700">
                        <Pencil size={15} />
                      </button>
                      {p.isActive ? (
                        <button onClick={() => setActive(p, false)} aria-label={`Pause ${p.name}`} title="Pause" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-red-50 hover:text-red-600">
                          <Ban size={15} />
                        </button>
                      ) : (
                        <button onClick={() => setActive(p, true)} aria-label={`Unpause ${p.name}`} title="Unpause" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-primary-50 hover:text-primary-700">
                          <CheckCircle2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && <EditPartner partner={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}

function EditPartner({ partner, onClose, onSaved }: { partner: AdminPartner; onClose: () => void; onSaved: () => Promise<void> }) {
  const { showToast } = useToast();
  const [vehicle, setVehicle] = useState(partner.vehicle);
  const [areas, setAreas] = useState(partner.serviceAreas.join(", "));
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/admin/delivery/partners/${partner.id}`, { vehicle, serviceAreas: areas });
      showToast(`${partner.name} updated.`);
      onClose();
      await onSaved();
    } catch (err) {
      showToast(errorMessage(err), "error");
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Edit ${partner.name}`}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label htmlFor="e-vehicle" className={labelClass}>Vehicle</label>
          <select id="e-vehicle" value={vehicle} onChange={(e) => setVehicle(e.target.value as Vehicle)} className={inputClass}>
            {VEHICLES.map((v) => (
              <option key={v} value={v}>{VEHICLE_LABELS[v]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="e-areas" className={labelClass}>Pincodes they cover (comma separated)</label>
          <textarea id="e-areas" rows={3} value={areas} onChange={(e) => setAreas(e.target.value)} className={inputClass} />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className={buttonClasses("ghost", "sm")}>Cancel</button>
          <button type="submit" disabled={saving} className={buttonClasses("primary", "sm")}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}
