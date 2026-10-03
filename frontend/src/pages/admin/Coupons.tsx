import { useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { useCoupons } from "@/context/CouponsContext";
import { useCategories } from "@/context/CategoriesContext";
import { Badge } from "@/components/common/Badge";
import { Modal } from "@/components/common/Modal";
import { EmptyState } from "@/components/common/EmptyState";
import { buttonClasses } from "@/components/common/Button";
import type { Coupon, CouponType } from "@/types";

const inputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

const emptyForm = {
  code: "",
  type: "percent" as CouponType,
  value: 10,
  description: "",
  active: true,
  minOrderValue: "" as number | "",
  categoryOnly: "" as string,
};

export default function AdminCoupons() {
  const { categories } = useCategories();
  const { coupons, addCoupon, updateCoupon, deleteCoupon } = useCoupons();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [form, setForm] = useState(emptyForm);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(coupon: Coupon) {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
      active: coupon.active,
      minOrderValue: coupon.minOrderValue ?? "",
      categoryOnly: coupon.categoryOnly ?? "",
    });
    setFormOpen(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      description: form.description.trim(),
      active: form.active,
      minOrderValue: form.minOrderValue === "" ? undefined : Number(form.minOrderValue),
      categoryOnly: (form.categoryOnly || undefined) as Coupon["categoryOnly"],
    };
    if (editing) {
      updateCoupon(editing.id, payload);
    } else {
      addCoupon(payload);
    }
    setFormOpen(false);
  }

  function confirmDelete() {
    if (deleteTarget) {
      deleteCoupon(deleteTarget.id);
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Coupons / Offers</h1>
          <p className="mt-1 text-sm text-stone-500">Manage discount codes available at checkout.</p>
        </div>
        <button onClick={openAdd} className={buttonClasses("primary", "md")}>
          <Plus size={16} /> Add Coupon
        </button>
      </div>

      {coupons.length === 0 ? (
        <EmptyState icon={Tag} title="No coupons yet" description="Add a coupon to offer discounts at checkout." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50">
                <tr className="text-xs font-bold uppercase text-stone-400">
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Discount</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Conditions</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-t border-stone-100">
                    <td className="px-5 py-3 font-bold text-stone-800">{c.code}</td>
                    <td className="px-5 py-3 text-stone-600">{c.type === "percent" ? `${c.value}%` : `₹${c.value}`}</td>
                    <td className="px-5 py-3 text-stone-500">{c.description}</td>
                    <td className="px-5 py-3 text-stone-500">
                      {c.minOrderValue ? `Min ₹${c.minOrderValue}` : ""}
                      {c.categoryOnly ? ` · ${c.categoryOnly} only` : ""}
                      {!c.minOrderValue && !c.categoryOnly && "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={c.active ? "green" : "gray"}>{c.active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(c)} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-primary-50 hover:text-primary-700">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setDeleteTarget(c)} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-red-50 hover:text-red-600">
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

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit Coupon" : "Add Coupon"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="Coupon Code (e.g. FARM10)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={`${inputClass} uppercase`} />
          <div className="grid grid-cols-2 gap-4">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CouponType })} className={inputClass}>
              <option value="percent">Percent Off (%)</option>
              <option value="flat">Flat Amount (₹)</option>
            </select>
            <input required type="number" min={1} placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className={inputClass} />
          </div>
          <input required placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
          <div className="grid grid-cols-2 gap-4">
            <input type="number" min={0} placeholder="Min Order Value (optional)" value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: e.target.value === "" ? "" : Number(e.target.value) })} className={inputClass} />
            <select value={form.categoryOnly} onChange={(e) => setForm({ ...form, categoryOnly: e.target.value })} className={inputClass}>
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name} only</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-stone-700">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 accent-primary-600" />
            Active (usable at checkout)
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setFormOpen(false)} className={buttonClasses("ghost", "md")}>Cancel</button>
            <button type="submit" className={buttonClasses("primary", "md")}>{editing ? "Save Changes" : "Add Coupon"}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Coupon">
        <p className="text-sm text-stone-600">Are you sure you want to delete "{deleteTarget?.code}"?</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className={buttonClasses("ghost", "sm")}>Cancel</button>
          <button onClick={confirmDelete} className={buttonClasses("danger", "sm")}>Delete</button>
        </div>
      </Modal>
    </div>
  );
}
