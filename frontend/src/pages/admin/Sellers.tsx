import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Trash2, BadgeCheck, ShieldCheck, ShieldX } from "lucide-react";
import { useSellers } from "@/context/SellersContext";
import { useProducts } from "@/context/ProductsContext";
import { useToast } from "@/context/ToastContext";
import { errorMessage } from "@/lib/api";
import { SearchBar } from "@/components/common/SearchBar";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import { buttonClasses } from "@/components/common/Button";
import type { Seller } from "@/types";

export default function AdminSellers() {
  const { sellers, updateSeller, deleteSeller } = useSellers();
  const { reload: reloadProducts } = useProducts();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Seller | null>(null);

  const filtered = sellers.filter(
    (s) =>
      s.farmName.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase())
  );

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteSeller(deleteTarget.id);
      // The seller's listings were hidden too, so refresh the catalog.
      await reloadProducts();
      showToast(`${deleteTarget.farmName} removed`);
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  async function setVerified(seller: Seller, verified: boolean) {
    try {
      await updateSeller(seller.id, { verified });
      showToast(verified ? `${seller.farmName} verified` : `Verification removed for ${seller.farmName}`);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Farmers/Sellers</h1>
      <p className="mt-1 text-sm text-stone-500">
        All local sellers and farmers registered on the platform. Verify a farmer to show their "Verified Farmer" badge site-wide.
      </p>

      <SearchBar value={search} onChange={setSearch} className="mt-6 max-w-md" placeholder="Search sellers..." suggestions={false} />

      <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50">
              <tr className="text-xs font-bold uppercase text-stone-400">
                <th className="px-5 py-3">Seller</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Products</th>
                <th className="px-5 py-3">Rating</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((seller) => (
                <tr key={seller.id} className="border-t border-stone-100">
                  <td className="flex items-center gap-3 px-5 py-3">
                    <img src={seller.image} alt={seller.name} className="h-10 w-10 rounded-full object-cover" />
                    <div>
                      <p className="font-semibold text-stone-800">{seller.farmName}</p>
                      <p className="text-xs text-stone-400">{seller.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-stone-500">{seller.location}, {seller.state}</td>
                  <td className="px-5 py-3 text-stone-500">{seller.productsCount}</td>
                  <td className="px-5 py-3 text-stone-500">★ {seller.rating}</td>
                  <td className="px-5 py-3">
                    {seller.verified ? (
                      <Badge tone="green"><span className="flex items-center gap-1"><BadgeCheck size={12} /> Verified</span></Badge>
                    ) : (
                      <Badge tone="gray">Pending</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <Link to={`/sellers/${seller.id}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-blue-50 hover:text-blue-600">
                        <Eye size={15} />
                      </Link>
                      {seller.verified ? (
                        <button
                          onClick={() => setVerified(seller, false)}
                          title="Reject / revoke verification"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-amber-50 hover:text-amber-600"
                        >
                          <ShieldX size={15} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setVerified(seller, true)}
                          title="Verify farmer"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-green-50 hover:text-green-600"
                        >
                          <ShieldCheck size={15} />
                        </button>
                      )}
                      <button onClick={() => setDeleteTarget(seller)} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-red-50 hover:text-red-600">
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

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Seller">
        <p className="text-sm text-stone-600">
          Are you sure you want to remove "{deleteTarget?.farmName}" from the platform?
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className={buttonClasses("ghost", "sm")}>Cancel</button>
          <button onClick={confirmDelete} className={buttonClasses("danger", "sm")}>Remove</button>
        </div>
      </Modal>
    </div>
  );
}
