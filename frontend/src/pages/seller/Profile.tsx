import { useState, type FormEvent } from "react";
import { BadgeCheck, Clock } from "lucide-react";
import { useSellers } from "@/context/SellersContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { buttonClasses } from "@/components/common/Button";
import { Loading } from "@/components/common/Loading";
import { EmptyState } from "@/components/common/EmptyState";
import { errorMessage } from "@/lib/api";
import type { Seller } from "@/types";

const inputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";
const labelClass = "mb-1.5 block text-xs font-bold text-stone-600";

export default function SellerProfile() {
  const { user } = useAuth();
  const { sellers, loading } = useSellers();
  const seller = sellers.find((s) => s.id === user?.sellerId);

  if (loading) {
    return <Loading label="Loading your shop..." />;
  }
  if (!seller) {
    return <EmptyState title="Shop profile not found" description="Please log in again or contact support." />;
  }
  // Keyed so the form re-initialises if the profile is reloaded.
  return <SellerProfileForm key={seller.id} seller={seller} />;
}

function SellerProfileForm({ seller }: { seller: Seller }) {
  const { updateMySeller } = useSellers();
  const { refreshUser } = useAuth();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: seller.name,
    farmName: seller.farmName,
    phone: seller.phone,
    email: seller.email,
    location: seller.location,
    about: seller.about,
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMySeller(form);
      // Name, email and shop name also live on the logged-in user.
      await refreshUser();
      showToast("Profile updated successfully!");
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-extrabold text-stone-900">Seller Profile</h1>
      <p className="mb-6 text-sm text-stone-500">Update your shop and personal information.</p>

      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="mb-6 flex items-center gap-4">
          {seller.image ? (
            <img src={seller.image} alt={seller.name} className="h-20 w-20 rounded-full object-cover ring-4 ring-primary-50" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 text-2xl font-bold text-primary-700">
              {seller.farmName.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-base font-bold text-stone-900">{seller.farmName}</p>
            <p className="text-sm text-stone-500">Seller since {seller.joinedYear}</p>
            {seller.verified ? (
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary-700">
                <BadgeCheck size={14} /> Verified Farmer
              </p>
            ) : (
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-600">
                <Clock size={14} /> Awaiting verification by the Mana Oori Santha team
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Your Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Shop / Farm Name</label>
              <input required value={form.farmName} onChange={(e) => setForm({ ...form, farmName: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Location</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>About Your Farm</label>
            <textarea
              rows={4}
              value={form.about}
              onChange={(e) => setForm({ ...form, about: e.target.value })}
              className={`${inputClass} resize-none`}
            />
          </div>
          <button type="submit" disabled={saving} className={buttonClasses("primary", "lg")}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
