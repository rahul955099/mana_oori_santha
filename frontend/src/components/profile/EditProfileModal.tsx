import { useEffect, useState, type FormEvent } from "react";
import { User, Camera } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { buttonClasses } from "@/components/common/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

const inputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

export function EditProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", mobile: "", profilePhoto: "" });

  useEffect(() => {
    if (isOpen && user) {
      setForm({
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        profilePhoto: user.profilePhoto ?? "",
      });
    }
  }, [isOpen, user]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, profilePhoto: reader.result as string }));
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    updateProfile(form);
    showToast("Profile updated successfully.");
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex justify-center">
          <label className="relative cursor-pointer">
            {form.profilePhoto ? (
              <img src={form.profilePhoto} alt="Profile" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                <User size={30} />
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm">
              <Camera size={13} />
            </span>
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </label>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-stone-600">Full Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-stone-600">Email Address</label>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-stone-600">Phone Number</label>
          <input required type="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className={inputClass} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className={buttonClasses("ghost", "md")}>Cancel</button>
          <button type="submit" className={buttonClasses("primary", "md")}>Save Changes</button>
        </div>
      </form>
    </Modal>
  );
}
