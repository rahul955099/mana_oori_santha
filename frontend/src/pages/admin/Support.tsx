import { useState } from "react";
import { LifeBuoy } from "lucide-react";
import { useSupport } from "@/context/SupportContext";
import { useToast } from "@/context/ToastContext";
import { SearchBar } from "@/components/common/SearchBar";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import { TicketThread } from "@/components/support/TicketThread";
import { errorMessage } from "@/lib/api";
import { formatDate } from "@/utils/format";
import { SUPPORT_STATUS } from "@/utils/support";
import { SUPPORT_CATEGORY_LABELS, type SupportRequestStatus } from "@/types";

const statusOptions: SupportRequestStatus[] = ["open", "in-progress", "resolved"];

export default function AdminSupport() {
  const { requests, loading, updateRequestStatus } = useSupport();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SupportRequestStatus>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const selected = requests.find((r) => r.id === openId) ?? null;

  async function handleStatusChange(id: string, status: SupportRequestStatus) {
    try {
      await updateRequestStatus(id, status);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  const term = search.toLowerCase();
  const filtered = requests.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(term) ||
      r.userName.toLowerCase().includes(term) ||
      r.userEmail.toLowerCase().includes(term) ||
      (r.orderId ?? "").toLowerCase().includes(term);
    return matchesSearch && (statusFilter === "all" || r.status === statusFilter);
  });

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Customer Support</h1>
      <p className="mt-1 text-sm text-stone-500">Support requests raised by customers. Open one to read and reply.</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <SearchBar value={search} onChange={setSearch} className="flex-1" placeholder="Search by request ID, customer or order ID..." suggestions={false} />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-600 outline-none focus:border-primary-400"
        >
          <option value="all">All Status</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{SUPPORT_STATUS[s].label}</option>
          ))}
        </select>
      </div>

      {loading && requests.length === 0 ? (
        <Loading label="Loading requests..." />
      ) : filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={LifeBuoy} title="No support requests" description="Customer support requests will appear here as they come in." />
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50">
                <tr className="text-xs font-bold uppercase text-stone-400">
                  <th className="px-5 py-3">Request</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Message</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} onClick={() => setOpenId(r.id)} className="cursor-pointer border-t border-stone-100 align-top hover:bg-stone-50">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-stone-800">{r.id}</p>
                      <p className="text-xs text-stone-400">{formatDate(r.updatedAt)}</p>
                    </td>
                    <td className="px-5 py-3 text-stone-600">
                      <p className="font-medium">{r.userName}</p>
                      <p className="text-xs text-stone-400">{r.userEmail}</p>
                    </td>
                    <td className="px-5 py-3 text-stone-500">
                      {SUPPORT_CATEGORY_LABELS[r.category]}
                      {r.orderId && <p className="text-xs text-stone-400">{r.orderId}</p>}
                    </td>
                    <td className="max-w-xs px-5 py-3 text-stone-500">
                      <p className="line-clamp-2">{r.message}</p>
                      {r.replies.length > 0 && <p className="mt-1 text-[11px] text-stone-400">{r.replies.length} repl{r.replies.length === 1 ? "y" : "ies"}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={SUPPORT_STATUS[r.status].tone}>{SUPPORT_STATUS[r.status].label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={!!selected} onClose={() => setOpenId(null)} title={selected ? `${selected.id} · ${selected.userName}` : ""}>
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-500">Status</span>
              <select
                value={selected.status}
                onChange={(e) => handleStatusChange(selected.id, e.target.value as SupportRequestStatus)}
                className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-bold text-stone-600 outline-none"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{SUPPORT_STATUS[s].label}</option>
                ))}
              </select>
            </div>
            <TicketThread ticket={selected} viewer="admin" />
          </div>
        )}
      </Modal>
    </div>
  );
}
