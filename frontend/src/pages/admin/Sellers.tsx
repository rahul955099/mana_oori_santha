import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Trash2, BadgeCheck } from "lucide-react";
import { sellers as initialSellers } from "@/data/sellers";
import { SearchBar } from "@/components/common/SearchBar";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import { buttonClasses } from "@/components/common/Button";
import type { Seller } from "@/types";

export default function AdminSellers() {
  const [sellers, setSellers] = useState<Seller[]>(initialSellers);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Seller | null>(null);

  const filtered = sellers.filter(
    (s) =>
      s.farmName.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase())
  );

  function confirmDelete() {
    if (deleteTarget) {
      setSellers((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Sellers</h1>
      <p className="mt-1 text-sm text-stone-500">All local sellers and farmers registered on the platform.</p>

      <SearchBar value={search} onChange={setSearch} className="mt-6 max-w-md" placeholder="Search sellers..." />

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
