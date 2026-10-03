import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/common/Modal";
import { buttonClasses } from "@/components/common/Button";
import { useAddresses } from "@/context/AddressContext";
import { useToast } from "@/context/ToastContext";
import { errorMessage } from "@/lib/api";
import type { Address, AddressType } from "@/types";

const inputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

const emptyForm = {
  type: "home" as AddressType,
  fullName: "",
  phone: "",
  houseNo: "",
  street: "",
  city: "",
  district: "",
  state: "",
  pincode: "",
  landmark: "",
};

export function AddressFormModal({
  isOpen,
  onClose,
  editingAddress,
}: {
  isOpen: boolean;
  onClose: () => void;
  editingAddress: Address | null;
}) {
  const { addAddress, updateAddress } = useAddresses();
  const { showToast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(
        editingAddress
          ? { ...editingAddress, district: editingAddress.district ?? "", landmark: editingAddress.landmark ?? "" }
          : emptyForm,
      );
    }
  }, [isOpen, editingAddress]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingAddress) {
        await updateAddress(editingAddress.id, form);
        showToast("Address updated.");
      } else {
        await addAddress(form);
        showToast("Address added.");
      }
      onClose();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingAddress ? "Edit Address" : "Add New Address"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-stone-600">Address Type</label>
          <div className="flex gap-2">
            {(["home", "work", "other"] as AddressType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, type: t })}
                className={`flex-1 rounded-xl border-2 py-2 text-xs font-bold capitalize transition ${
                  form.type === t ? "border-primary-500 bg-primary-50 text-primary-800" : "border-stone-200 text-stone-500"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input required placeholder="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputClass} />
          <input required type="tel" pattern="[6-9][0-9]{9}" title="10-digit mobile number" placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          <input required placeholder="House / Flat No." value={form.houseNo} onChange={(e) => setForm({ ...form, houseNo: e.target.value })} className={inputClass} />
          <input required placeholder="Street / Area" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className={inputClass} />
          <input required placeholder="City / Village" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} />
          <input placeholder="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className={inputClass} />
          <input required placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputClass} />
          <input required pattern="[1-9][0-9]{5}" title="6-digit pincode" placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className={inputClass} />
          <input placeholder="Landmark (optional)" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} className={inputClass} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className={buttonClasses("ghost", "md")}>Cancel</button>
          <button type="submit" disabled={saving} className={buttonClasses("primary", "md")}>
            {editingAddress ? "Save Changes" : "Add Address"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
