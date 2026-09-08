import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/common/Modal";
import { buttonClasses } from "@/components/common/Button";
import { useAddresses } from "@/context/AddressContext";
import { useToast } from "@/context/ToastContext";
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

  useEffect(() => {
    if (isOpen) {
      setForm(editingAddress ? { ...editingAddress, landmark: editingAddress.landmark ?? "" } : emptyForm);
    }
  }, [isOpen, editingAddress]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (editingAddress) {
      updateAddress(editingAddress.id, form);
      showToast("Address updated.");
    } else {
      addAddress(form);
      showToast("Address added.");
    }
    onClose();
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
          <input required type="tel" pattern="[0-9]{10}" placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          <input required placeholder="House / Flat No." value={form.houseNo} onChange={(e) => setForm({ ...form, houseNo: e.target.value })} className={inputClass} />
          <input required placeholder="Street / Area" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className={inputClass} />
          <input required placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} />
          <input required placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputClass} />
          <input required pattern="[0-9]{6}" placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className={inputClass} />
          <input placeholder="Landmark (optional)" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} className={inputClass} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className={buttonClasses("ghost", "md")}>Cancel</button>
          <button type="submit" className={buttonClasses("primary", "md")}>
            {editingAddress ? "Save Changes" : "Add Address"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
