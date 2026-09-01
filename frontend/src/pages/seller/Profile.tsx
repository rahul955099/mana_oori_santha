import { useState, type FormEvent } from "react";
import { sellers } from "@/data/sellers";
import { useToast } from "@/context/ToastContext";
import { buttonClasses } from "@/components/common/Button";
import { CURRENT_SELLER_ID } from "@/data/currentSeller";

const inputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";
const labelClass = "mb-1.5 block text-xs font-bold text-stone-600";

export default function SellerProfile() {
  const seller = sellers.find((s) => s.id === CURRENT_SELLER_ID)!;
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: seller.name,
    farmName: seller.farmName,
    phone: seller.phone,
    email: seller.email,
    location: seller.location,
    about: seller.about,
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    showToast("Profile updated successfully!");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-extrabold text-stone-900">Seller Profile</h1>
      <p className="mb-6 text-sm text-stone-500">Update your shop and personal information.</p>

      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="mb-6 flex items-center gap-4">
          <img src={seller.image} alt={seller.name} className="h-20 w-20 rounded-full object-cover ring-4 ring-primary-50" />
          <div>
            <p className="text-base font-bold text-stone-900">{seller.farmName}</p>
            <p className="text-sm text-stone-500">Seller since {seller.joinedYear}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Your Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Shop / Farm Name</label>
              <input value={form.farmName} onChange={(e) => setForm({ ...form, farmName: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
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
          <button type="submit" className={buttonClasses("primary", "lg")}>
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
