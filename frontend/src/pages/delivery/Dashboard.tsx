import { useCallback, useEffect, useState, type FormEvent } from "react";
import { MapPin, Phone, Store, Package, AlertTriangle, CheckCircle2, Navigation } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { Loading } from "@/components/common/Loading";
import { Modal } from "@/components/common/Modal";
import { Badge } from "@/components/common/Badge";
import { buttonClasses } from "@/components/common/Button";
import { api, errorMessage } from "@/lib/api";
import { formatCurrency } from "@/utils/format";
import type { DeliveryJob, PartnerMe } from "@/types/delivery";

const inputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-3 text-base outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

function stage(job: DeliveryJob): { label: string; tone: "gray" | "blue" | "gold" | "green" } {
  if (!job.acceptedAt) return { label: "New: please accept", tone: "gold" };
  if (job.status === "confirmed") return { label: "Waiting for the shop to pack", tone: "gray" };
  if (job.status === "packed") return { label: job.lastProblem ? "Retry delivery" : "Ready to pick up", tone: "blue" };
  return { label: "On the way", tone: "gold" };
}

/** Delivery partner: availability and today's jobs, with the next action for each. */
export default function DeliveryDashboard() {
  const { showToast } = useToast();
  const [me, setMe] = useState<PartnerMe | null>(null);
  const [jobs, setJobs] = useState<DeliveryJob[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [delivering, setDelivering] = useState<DeliveryJob | null>(null);
  const [failing, setFailing] = useState<DeliveryJob | null>(null);

  const load = useCallback(async () => {
    try {
      const [profile, list] = await Promise.all([api.get<PartnerMe>("/delivery/me"), api.get<{ active: DeliveryJob[] }>("/delivery/orders")]);
      setMe(profile);
      setJobs(list.active);
    } catch (err) {
      showToast(errorMessage(err), "error");
      setJobs([]);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(job: DeliveryJob, action: "accept" | "decline" | "pickup", body?: object) {
    setBusy(`${job.id}:${action}`);
    try {
      const res = await api.post<{ job: DeliveryJob | null }>(`/delivery/orders/${job.id}/${action}`, body);
      showToast(
        action === "accept" ? "Accepted. Pick it up once the shop has packed it." : action === "pickup" ? "Picked up. The customer has been told." : "Declined."
      );
      void res;
      await load();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  }

  async function toggleAvailability() {
    if (!me?.partner) return;
    const next = !me.partner.availableToday;
    try {
      await api.patch("/delivery/me/availability", { available: next });
      setMe({ ...me, partner: { ...me.partner, availableToday: next } });
      showToast(next ? "You're available for deliveries today." : "You're off for today.");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  if (!me || !jobs) return <Loading label="Loading your deliveries..." />;
  if (!me.partner) return <p className="text-sm text-stone-500">Your delivery profile wasn't found. Please contact the team.</p>;
  const p = me.partner;
  const cashToCollect = jobs.reduce((s, j) => s + j.total, 0);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold text-stone-900">Hi {p.name.split(" ")[0]}</h1>

      {!p.isActive && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">Your delivery account is paused. Please contact the team.</p>
      )}

      <div className={`mt-4 flex items-center justify-between gap-4 rounded-2xl border p-5 ${p.availableToday ? "border-primary-200 bg-primary-50" : "border-stone-200 bg-white"}`}>
        <div>
          <p className="font-bold text-stone-900">{p.availableToday ? "You're available today" : "You're off today"}</p>
          <p className="text-sm text-stone-500">
            {p.availableToday ? "The team can give you deliveries. Switch off when you're done." : "Switch on to start getting deliveries."}
          </p>
        </div>
        <button
          role="switch"
          aria-checked={p.availableToday}
          aria-label="Available today"
          onClick={toggleAvailability}
          disabled={!p.isActive}
          className={`relative h-8 w-14 shrink-0 rounded-full transition ${p.availableToday ? "bg-primary-600" : "bg-stone-300"} disabled:opacity-50`}
        >
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${p.availableToday ? "left-7" : "left-1"}`} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Stat label="Active" value={String(jobs.length)} />
        <Stat label="Cash to collect" value={formatCurrency(cashToCollect)} />
        <Stat label="Cash in hand" value={formatCurrency(me.stats.cashInHand)} />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold text-stone-900">Your deliveries</h2>
      {jobs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-200 bg-white px-6 py-10 text-center text-sm text-stone-400">
          No deliveries right now. New ones will appear here and you'll get a notification.
        </p>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const st = stage(job);
            return (
              <article key={job.id} className="rounded-2xl border border-stone-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-stone-900">{job.id}</p>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
                {job.lastProblem && (
                  <p className="mt-3 flex items-start gap-2 rounded-lg bg-accent-50 px-3 py-2 text-xs font-medium text-accent-800">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" /> Last attempt: {job.lastProblem}. Try again when ready, or call the team.
                  </p>
                )}

                <div className="mt-4 space-y-3">
                  {job.pickups?.map((pk) => (
                    <div key={pk.shop} className="rounded-xl bg-stone-50 p-3 text-sm">
                      <p className="flex items-center gap-2 font-semibold text-stone-800">
                        <Store size={15} className="text-primary-600" /> Pick up: {pk.shop}
                      </p>
                      {pk.location && <p className="mt-0.5 pl-6 text-stone-500">{pk.location}</p>}
                      <ul className="mt-1 pl-6 text-xs text-stone-500">
                        {pk.items.map((i, n) => (
                          <li key={n}>
                            {i.name}
                            {i.size ? ` · Size ${i.size}` : ""} · {i.unit} × {i.quantity}
                          </li>
                        ))}
                      </ul>
                      {pk.phone && (
                        <a href={`tel:${pk.phone}`} className="mt-2 ml-6 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700">
                          <Phone size={13} /> Call {pk.contact || "shop"}
                        </a>
                      )}
                    </div>
                  ))}

                  <div className="rounded-xl bg-stone-50 p-3 text-sm">
                    <p className="flex items-center gap-2 font-semibold text-stone-800">
                      <MapPin size={15} className="text-primary-600" /> Deliver to: {job.customer.name}
                    </p>
                    <p className="mt-0.5 pl-6 text-stone-500">{job.customer.address}</p>
                    <div className="mt-2 flex flex-wrap gap-2 pl-6">
                      {job.customer.phone && (
                        <a href={`tel:${job.customer.phone}`} className={buttonClasses("ghost", "sm")}>
                          <Phone size={14} /> Call customer
                        </a>
                      )}
                      {job.customer.mapsUrl && (
                        <a href={job.customer.mapsUrl} target="_blank" rel="noreferrer" className={buttonClasses("ghost", "sm")}>
                          <Navigation size={14} /> Open in Maps
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <p className="mt-4 flex items-center justify-between rounded-xl bg-primary-50 px-4 py-3 text-sm">
                  <span className="flex items-center gap-2 font-medium text-primary-800">
                    <Package size={15} /> {job.itemsCount} item(s) · Cash on delivery
                  </span>
                  <span className="text-lg font-extrabold text-primary-800">{formatCurrency(job.total)}</span>
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {!job.acceptedAt && (
                    <>
                      <button disabled={!!busy} onClick={() => act(job, "accept")} className={buttonClasses("primary", "md", "flex-1")}>
                        Accept
                      </button>
                      <button
                        disabled={!!busy}
                        onClick={() => {
                          const reason = window.prompt("Why can't you take this delivery? (optional)") ?? undefined;
                          if (reason === undefined) return;
                          void act(job, "decline", { reason: reason || undefined });
                        }}
                        className={buttonClasses("ghost", "md")}
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {job.acceptedAt && job.status === "packed" && (
                    <button disabled={!!busy} onClick={() => act(job, "pickup")} className={buttonClasses("primary", "md", "flex-1")}>
                      {busy === `${job.id}:pickup` ? "Saving..." : "Picked Up"}
                    </button>
                  )}
                  {job.status === "out-for-delivery" && (
                    <>
                      <button onClick={() => setDelivering(job)} className={buttonClasses("primary", "md", "flex-1")}>
                        <CheckCircle2 size={16} /> Delivered
                      </button>
                      <button onClick={() => setFailing(job)} className={buttonClasses("ghost", "md")}>
                        Couldn't Deliver
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {delivering && <DeliverModal job={delivering} onClose={() => setDelivering(null)} onDone={load} />}
      {failing && <FailModal job={failing} reasons={me.failReasons} onClose={() => setFailing(null)} onDone={load} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-2 py-3">
      <p className="text-lg font-extrabold text-stone-900">{value}</p>
      <p className="text-[11px] font-medium text-stone-500">{label}</p>
    </div>
  );
}

function DeliverModal({ job, onClose, onDone }: { job: DeliveryJob; onClose: () => void; onDone: () => Promise<void> }) {
  const { showToast } = useToast();
  const [code, setCode] = useState("");
  const [cash, setCash] = useState(String(job.total));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post(`/delivery/orders/${job.id}/deliver`, { code, cashCollected: Number(cash) });
      showToast("Delivered. Thank you!");
      onClose();
      await onDone();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Deliver ${job.id}`}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="code" className="mb-1.5 block text-sm font-bold text-stone-700">
            Customer's 4-digit code
          </label>
          <input
            id="code"
            required
            autoFocus
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className={`${inputClass} text-center text-3xl font-bold tracking-[0.5em]`}
          />
          <p className="mt-1.5 text-xs text-stone-400">
            Ask the customer for the code in their order. If they don't have it, call the team: only an admin can complete it without the code.
          </p>
        </div>
        <div>
          <label htmlFor="cash" className="mb-1.5 block text-sm font-bold text-stone-700">
            Cash collected (₹)
          </label>
          <input id="cash" required type="number" min={0} step="0.01" inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} className={inputClass} />
          {Number(cash) !== job.total && <p className="mt-1.5 text-xs font-medium text-accent-700">The order total is {formatCurrency(job.total)}. The team will be told about the difference.</p>}
        </div>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <button type="submit" disabled={saving} className={buttonClasses("primary", "lg", "w-full")}>
          {saving ? "Saving..." : "Confirm Delivery"}
        </button>
      </form>
    </Modal>
  );
}

function FailModal({ job, reasons, onClose, onDone }: { job: DeliveryJob; reasons: string[]; onClose: () => void; onDone: () => Promise<void> }) {
  const { showToast } = useToast();
  const [reason, setReason] = useState(reasons[0] ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/delivery/orders/${job.id}/fail`, { reason, note: note.trim() || undefined });
      showToast("Noted. The team will decide what happens next.");
      onClose();
      await onDone();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Couldn't deliver ${job.id}`}>
      <form onSubmit={submit} className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-bold text-stone-700">What happened?</legend>
          {reasons.map((r) => (
            <label key={r} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm ${reason === r ? "border-primary-500 bg-primary-50" : "border-stone-200"}`}>
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="h-4 w-4" />
              {r}
            </label>
          ))}
        </fieldset>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything else the team should know (optional)" className={inputClass} />
        <p className="text-xs text-stone-500">Keep the goods safe. The team will tell you whether to try again or return them to the shop.</p>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <button type="submit" disabled={saving} className={buttonClasses("danger", "lg", "w-full")}>
          {saving ? "Saving..." : "Report Not Delivered"}
        </button>
      </form>
    </Modal>
  );
}
