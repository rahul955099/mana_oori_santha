import { useState } from "react";
import { useSupport } from "@/context/SupportContext";
import { useNotifications } from "@/context/NotificationContext";
import { SearchBar } from "@/components/common/SearchBar";
import { EmptyState } from "@/components/common/EmptyState";
import { LifeBuoy } from "lucide-react";
import { SUPPORT_CATEGORY_LABELS, type SupportRequestStatus } from "@/types";

const statusOptions: SupportRequestStatus[] = ["open", "in-progress", "resolved"];

const statusStyle: Record<SupportRequestStatus, string> = {
  open: "bg-red-100 text-red-700",
  "in-progress": "bg-accent-100 text-accent-800",
  resolved: "bg-primary-100 text-primary-700",
};

export default function AdminSupport() {
  const { requests, updateRequestStatus } = useSupport();
  const { notifyUser } = useNotifications();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SupportRequestStatus>("all");

  function handleStatusChange(requestId: string, userId: string, status: SupportRequestStatus) {
    updateRequestStatus(requestId, status);
    notifyUser(userId, {
      type: "support-update",
      title: `Support request ${requestId} updated`,
      message: `Your support request is now "${status.replace("-", " ")}".`,
    });
  }

  const filtered = requests.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.userName.toLowerCase().includes(search.toLowerCase()) ||
      (r.orderId ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Customer Support</h1>
      <p className="mt-1 text-sm text-stone-500">Support requests raised by customers, including order-specific issues.</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <SearchBar value={search} onChange={setSearch} className="flex-1" placeholder="Search by request ID, customer or order ID..." suggestions={false} />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-600 outline-none focus:border-primary-400"
        >
          <option value="all">All Status</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s.replace("-", " ").toUpperCase()}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={LifeBuoy} title="No support requests" description="Customer support requests will appear here as they come in." />
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50">
                <tr className="text-xs font-bold uppercase text-stone-400">
                  <th className="px-5 py-3">Request ID</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Order ID</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Message</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-stone-100 align-top">
                    <td className="px-5 py-3 font-semibold text-stone-800">{r.id}</td>
                    <td className="px-5 py-3 text-stone-600">
                      <p className="font-medium">{r.userName}</p>
                      <p className="text-xs text-stone-400">{r.userEmail}</p>
                    </td>
                    <td className="px-5 py-3 text-stone-500">{r.orderId ?? "—"}</td>
                    <td className="px-5 py-3 text-stone-500">{SUPPORT_CATEGORY_LABELS[r.category]}</td>
                    <td className="max-w-xs px-5 py-3 text-stone-500">
                      <p className="line-clamp-2">{r.message}</p>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={r.status}
                        onChange={(e) => handleStatusChange(r.id, r.userId, e.target.value as SupportRequestStatus)}
                        className={`rounded-full border-0 px-2.5 py-1 text-xs font-bold outline-none ${statusStyle[r.status]}`}
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>{s.replace("-", " ").toUpperCase()}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
