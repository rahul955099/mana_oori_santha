import { useEffect, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { Loading } from "@/components/common/Loading";
import { Badge } from "@/components/common/Badge";
import { api, errorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/utils/format";
import type { DeliveryJob } from "@/types/delivery";

const ATTEMPT_TEXT = { failed: "Not delivered", declined: "Declined", "no-response": "Not accepted in time" } as const;

/** Delivery partner: past deliveries and attempts. Customer contact details are no longer shown. */
export default function DeliveryHistory() {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<DeliveryJob[] | null>(null);

  useEffect(() => {
    api
      .get<{ history: DeliveryJob[] }>("/delivery/orders")
      .then((r) => setJobs(r.history))
      .catch((err) => {
        showToast(errorMessage(err), "error");
        setJobs([]);
      });
  }, [showToast]);

  if (!jobs) return <Loading label="Loading history..." />;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold text-stone-900">History</h1>
      <p className="mt-1 text-sm text-stone-500">Your completed deliveries and attempts.</p>
      {jobs.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-stone-200 bg-white px-6 py-10 text-center text-sm text-stone-400">Nothing here yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {jobs.map((job) => (
            <li key={job.id} className="rounded-2xl border border-stone-200 bg-white p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-stone-900">{job.id}</p>
                {job.deliveredAt ? <Badge tone="green">Delivered</Badge> : <Badge tone="gray">{job.status}</Badge>}
              </div>
              <p className="mt-1 text-stone-500">
                {job.customer.name} · {job.customer.area}
              </p>
              {job.deliveredAt && (
                <p className="mt-2 text-stone-600">
                  {formatDate(job.deliveredAt)} · collected {formatCurrency(job.cashCollected ?? 0)} · earned{" "}
                  <span className="font-semibold text-primary-700">{formatCurrency(job.fee ?? 0)}</span>
                </p>
              )}
              {job.attempts.map((a, i) => (
                <p key={i} className="mt-1 text-xs text-stone-500">
                  {ATTEMPT_TEXT[a.kind]} on {formatDate(a.at)}
                  {a.reason ? `: ${a.reason}` : ""}
                  {a.fee > 0 ? ` · paid ${formatCurrency(a.fee)}` : ""}
                </p>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
