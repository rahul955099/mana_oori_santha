import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Trash2, BadgeCheck, ShieldCheck, ShieldX, FileSearch } from "lucide-react";
import { useSellers } from "@/context/SellersContext";
import { useProducts } from "@/context/ProductsContext";
import { useToast } from "@/context/ToastContext";
import { SearchBar } from "@/components/common/SearchBar";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import { Loading } from "@/components/common/Loading";
import { buttonClasses } from "@/components/common/Button";
import { api, errorMessage } from "@/lib/api";
import { formatDate } from "@/utils/format";
import type { BadgeTone } from "@/utils/orderStatus";
import type { SellerAccount, SellerStatus } from "@/types";

const STATUS: Record<SellerStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending Review", tone: "gold" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Rejected", tone: "red" },
  suspended: { label: "Suspended", tone: "red" },
};

type StatusAction = { seller: SellerAccount; status: SellerStatus };

export default function AdminSellers() {
  const { reload: reloadPublicSellers } = useSellers();
  const { reload: reloadProducts } = useProducts();
  const { showToast } = useToast();
  const [sellers, setSellers] = useState<SellerAccount[] | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | SellerStatus>("all");
  const [review, setReview] = useState<SellerAccount | null>(null);
  const [action, setAction] = useState<StatusAction | null>(null);
  const [reason, setReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SellerAccount | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setSellers((await api.get<{ sellers: SellerAccount[] }>("/sellers", { all: true })).sellers);
    } catch (err) {
      showToast(errorMessage(err), "error");
      setSellers([]);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Seller changes affect the public store, so refresh it too. */
  async function afterChange(updated?: SellerAccount) {
    if (updated) setSellers((prev) => prev?.map((s) => (s.id === updated.id ? updated : s)) ?? prev);
    else await load();
    await Promise.all([reloadPublicSellers(), reloadProducts()]);
  }

  async function openReview(seller: SellerAccount) {
    try {
      // The list shows masked numbers; the review shows them in full.
      setReview((await api.get<{ seller: SellerAccount }>(`/sellers/${seller.id}/kyc`)).seller);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  function startAction(seller: SellerAccount, status: SellerStatus) {
    setReview(null);
    setReason("");
    setAction({ seller, status });
  }

  async function confirmAction() {
    if (!action) return;
    setBusy(true);
    try {
      const { seller } = await api.patch<{ seller: SellerAccount }>(`/sellers/${action.seller.id}/status`, {
        status: action.status,
        reason: reason.trim() || undefined,
      });
      showToast(`${seller.farmName}: ${STATUS[seller.status].label}`);
      setAction(null);
      await afterChange(seller);
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function setVerified(seller: SellerAccount, verified: boolean) {
    try {
      const { seller: updated } = await api.patch<{ seller: SellerAccount }>(`/sellers/${seller.id}`, { verified });
      showToast(verified ? `${seller.farmName} verified` : `Verification removed for ${seller.farmName}`);
      await afterChange(updated);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/sellers/${deleteTarget.id}`);
      showToast(`${deleteTarget.farmName} removed`);
      setSellers((prev) => prev?.filter((s) => s.id !== deleteTarget.id) ?? prev);
      await afterChange();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  if (!sellers) return <Loading label="Loading sellers..." />;

  const pendingCount = sellers.filter((s) => s.status === "pending").length;
  const term = search.toLowerCase();
  const filtered = sellers.filter(
    (s) =>
      (filter === "all" || s.status === filter) &&
      (s.farmName.toLowerCase().includes(term) || s.name.toLowerCase().includes(term))
  );
  const needsReason = action?.status === "rejected" || action?.status === "suspended";

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Farmers/Sellers</h1>
      <p className="mt-1 text-sm text-stone-500">
        Review new sellers before their products go live. "Verified Farmer" is a separate trust badge shown to customers.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <SearchBar value={search} onChange={setSearch} className="flex-1" placeholder="Search sellers..." suggestions={false} />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-600 outline-none focus:border-primary-400"
        >
          <option value="all">All sellers</option>
          <option value="pending">Pending review ({pendingCount})</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50">
              <tr className="text-xs font-bold uppercase text-stone-400">
                <th className="px-5 py-3">Seller</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Products</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((seller) => (
                <tr key={seller.id} className="border-t border-stone-100">
                  <td className="flex items-center gap-3 px-5 py-3">
                    {seller.image ? (
                      <img src={seller.image} alt={seller.name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 font-bold text-primary-700">
                        {seller.farmName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="flex items-center gap-1 font-semibold text-stone-800">
                        {seller.farmName}
                        {seller.verified && <BadgeCheck size={14} className="text-primary-600" />}
                      </p>
                      <p className="text-xs text-stone-400">{seller.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-stone-500">{[seller.location, seller.state].filter(Boolean).join(", ")}</td>
                  <td className="px-5 py-3 text-stone-500">{seller.productsCount}</td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS[seller.status].tone}>{STATUS[seller.status].label}</Badge>
                    {seller.status === "pending" && !seller.kyc && <p className="mt-1 text-[11px] text-stone-400">Details not submitted</p>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openReview(seller)}
                        title="Review details"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-primary-50 hover:text-primary-700"
                      >
                        <FileSearch size={15} />
                      </button>
                      {seller.status === "approved" && (
                        <Link
                          to={`/sellers/${seller.id}`}
                          title="View public profile"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Eye size={15} />
                        </Link>
                      )}
                      <button
                        onClick={() => setVerified(seller, !seller.verified)}
                        title={seller.verified ? "Remove Verified Farmer badge" : "Give Verified Farmer badge"}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-green-50 hover:text-green-600"
                      >
                        {seller.verified ? <ShieldX size={15} /> : <ShieldCheck size={15} />}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(seller)}
                        title="Remove seller"
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
          {filtered.length === 0 && <p className="py-10 text-center text-sm text-stone-400">No sellers match.</p>}
        </div>
      </div>

      <Modal isOpen={!!review} onClose={() => setReview(null)} title={review ? `Review: ${review.farmName}` : ""}>
        {review && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge tone={STATUS[review.status].tone}>{STATUS[review.status].label}</Badge>
              {review.statusReason && <span className="text-xs text-stone-500">{review.statusReason}</span>}
            </div>
            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-stone-50 p-4">
              <Detail label="Contact" value={`${review.name} · ${review.phone}`} />
              <Detail label="Email" value={review.email} />
              {review.kyc ? (
                <>
                  <Detail label="Legal name" value={review.kyc.legalName} />
                  <Detail label="PAN" value={review.kyc.pan} />
                  <Detail label="GSTIN" value={review.kyc.gstin} />
                  <Detail label="Submitted" value={formatDate(review.kyc.submittedAt)} />
                </>
              ) : (
                <p className="col-span-2 text-stone-500">The seller hasn't submitted PAN and payout details yet.</p>
              )}
              {review.payout?.method === "upi" && <Detail label="Payout UPI" value={review.payout.upiId} />}
              {review.payout?.method === "bank" && (
                <>
                  <Detail label="Account holder" value={review.payout.accountHolder} />
                  <Detail label="Account number" value={review.payout.accountNumber} />
                  <Detail label="IFSC" value={review.payout.ifsc} />
                  <Detail label="Bank" value={review.payout.bankName} />
                </>
              )}
            </dl>
            <div className="flex flex-wrap justify-end gap-2">
              {review.status !== "approved" && (
                <button
                  disabled={!review.kyc}
                  onClick={() => startAction(review, "approved")}
                  className={buttonClasses("primary", "sm")}
                >
                  {review.status === "suspended" ? "Reinstate" : "Approve"}
                </button>
              )}
              {review.status === "pending" && (
                <button onClick={() => startAction(review, "rejected")} className={buttonClasses("danger", "sm")}>
                  Reject
                </button>
              )}
              {review.status === "approved" && (
                <button onClick={() => startAction(review, "suspended")} className={buttonClasses("danger", "sm")}>
                  Suspend
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!action}
        onClose={() => setAction(null)}
        title={action ? `${action.status === "approved" ? "Approve" : action.status === "rejected" ? "Reject" : "Suspend"} ${action.seller.farmName}` : ""}
      >
        <p className="text-sm text-stone-600">
          {action?.status === "approved"
            ? "Their products will appear in the store straight away."
            : action?.status === "rejected"
              ? "Tell the seller what to fix. They can update their details and resubmit."
              : "Their products will be hidden from the store until you reinstate them."}
        </p>
        {needsReason && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Reason (shown to the seller)"
            className="mt-3 w-full resize-none rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400"
          />
        )}
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setAction(null)} className={buttonClasses("ghost", "sm")}>
            Cancel
          </button>
          <button
            onClick={confirmAction}
            disabled={busy || (needsReason && !reason.trim())}
            className={buttonClasses(action?.status === "approved" ? "primary" : "danger", "sm")}
          >
            Confirm
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Seller">
        <p className="text-sm text-stone-600">
          Remove "{deleteTarget?.farmName}" from the platform? Their account is closed and their products are taken off the
          store. Past orders are kept.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className={buttonClasses("ghost", "sm")}>Cancel</button>
          <button onClick={confirmDelete} className={buttonClasses("danger", "sm")}>Remove</button>
        </div>
      </Modal>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase text-stone-400">{label}</dt>
      <dd className="break-words font-semibold text-stone-800">{value || "—"}</dd>
    </div>
  );
}
