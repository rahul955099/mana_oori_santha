import { useCallback, useEffect, useState } from "react";
import { Ban, CheckCircle2, Trash2, Users } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { SearchBar } from "@/components/common/SearchBar";
import { Badge } from "@/components/common/Badge";
import { Loading } from "@/components/common/Loading";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal } from "@/components/common/Modal";
import { buttonClasses } from "@/components/common/Button";
import { api, errorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/utils/format";

interface CustomerRow {
  id: string;
  userCode: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  joinedAt: string;
  isActive: boolean;
  orders: number;
  spent: number;
  lastOrderAt: string | null;
}

export default function AdminCustomers() {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<CustomerRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [blockTarget, setBlockTarget] = useState<CustomerRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setCustomers((await api.get<{ customers: CustomerRow[] }>("/admin/users")).customers);
    } catch (err) {
      showToast(errorMessage(err), "error");
      setCustomers([]);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setActive(customer: CustomerRow, isActive: boolean) {
    try {
      await api.patch(`/admin/users/${customer.id}`, { isActive });
      setCustomers((prev) => prev?.map((c) => (c.id === customer.id ? { ...c, isActive } : c)) ?? prev);
      showToast(isActive ? `${customer.name} unblocked` : `${customer.name} blocked`);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleting(true);
    try {
      const { mode } = await api.delete<{ mode: "removed" | "anonymized" }>(`/admin/users/${target.id}`);
      setCustomers((prev) => prev?.filter((c) => c.id !== target.id) ?? prev);
      showToast(
        mode === "removed" ? `${target.name} deleted.` : `${target.name} deleted. Past orders were kept without personal details.`
      );
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (!customers) return <Loading label="Loading customers..." />;

  const term = search.toLowerCase();
  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      c.userCode.toLowerCase().includes(term)
  );

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Customers</h1>
      <p className="mt-1 text-sm text-stone-500">
        {customers.length} registered customer{customers.length === 1 ? "" : "s"}. Spend excludes cancelled and returned orders.
      </p>

      <SearchBar value={search} onChange={setSearch} className="mt-6 max-w-md" placeholder="Search by name, email, phone or ID..." suggestions={false} />

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={Users} title="No customers found" description="Customers appear here once they register." />
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50">
                <tr className="text-xs font-bold uppercase text-stone-400">
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3 text-right">Orders</th>
                  <th className="px-5 py-3 text-right">Spent</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-stone-100">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-stone-800">{c.name}</p>
                      <p className="text-xs text-stone-400">
                        {c.userCode} · {c.email} · {c.phone}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-stone-500">{c.location || "—"}</td>
                    <td className="px-5 py-3 text-stone-500">{formatDate(c.joinedAt)}</td>
                    <td className="px-5 py-3 text-right text-stone-600">
                      {c.orders}
                      {c.lastOrderAt && <p className="text-[11px] text-stone-400">last {formatDate(c.lastOrderAt)}</p>}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-stone-800">{formatCurrency(c.spent)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={c.isActive ? "green" : "red"}>{c.isActive ? "Active" : "Blocked"}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        {c.isActive ? (
                          <button
                            onClick={() => setBlockTarget(c)}
                            title="Block customer"
                            aria-label={`Block ${c.name}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <Ban size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setActive(c, true)}
                            title="Unblock customer"
                            aria-label={`Unblock ${c.name}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-primary-50 hover:text-primary-700"
                          >
                            <CheckCircle2 size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(c)}
                          title="Delete customer"
                          aria-label={`Delete ${c.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Customer">
        <p className="text-sm text-stone-600">
          Permanently delete <span className="font-semibold">{deleteTarget?.name}</span> ({deleteTarget?.email})?
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-stone-500">
          <li>Their name, email, phone, saved addresses, cart and wishlist are erased. This can't be undone.</li>
          {deleteTarget && deleteTarget.orders > 0 ? (
            <li>
              {deleteTarget.orders === 1 ? "Their past order stays" : `Their ${deleteTarget.orders} past orders stay`} for your
              records and seller payouts, and their reviews show as "Former customer".
            </li>
          ) : (
            <li>They have no orders, so the account is removed completely.</li>
          )}
          <li>The email becomes free, so they could sign up again. To stop someone using the site, block them instead.</li>
        </ul>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className={buttonClasses("ghost", "sm")}>
            Cancel
          </button>
          <button onClick={confirmDelete} disabled={deleting} className={buttonClasses("danger", "sm")}>
            {deleting ? "Deleting..." : "Delete Customer"}
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!blockTarget} onClose={() => setBlockTarget(null)} title="Block Customer">
        <p className="text-sm text-stone-600">
          Block {blockTarget?.name}? They'll be logged out and won't be able to sign in or place orders until unblocked.
          Their order history is kept.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setBlockTarget(null)} className={buttonClasses("ghost", "sm")}>Cancel</button>
          <button
            onClick={async () => {
              if (blockTarget) await setActive(blockTarget, false);
              setBlockTarget(null);
            }}
            className={buttonClasses("danger", "sm")}
          >
            Block
          </button>
        </div>
      </Modal>
    </div>
  );
}
