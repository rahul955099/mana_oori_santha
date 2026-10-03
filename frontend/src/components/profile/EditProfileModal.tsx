import { useEffect, useState, type FormEvent } from "react";
import { User, Camera } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { buttonClasses } from "@/components/common/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

// Photos are stored inline until image uploads move to Cloudinary; the API accepts up to 2 MB per request.
const MAX_PHOTO_BYTES = 1024 * 1024;

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
    if (file.size > MAX_PHOTO_BYTES) {
      showToast("Please choose a photo smaller than 1 MB.", "error");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, profilePhoto: reader.result as string }));
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = await updateProfile(form);
    showToast(result.message, result.success ? "success" : "error");
    if (result.success) onClose();
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
