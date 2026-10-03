import { useState, type FormEvent } from "react";
import { Modal } from "@/components/common/Modal";
import { buttonClasses } from "@/components/common/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

const inputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

export function ChangePasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { changePassword } = useAuth();
  const { showToast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      setError("New password and confirmation do not match.");
      return;
    }
    const result = await changePassword(current, next);
    if (!result.success) {
      setError(result.message);
      return;
    }
    showToast(result.message);
    reset();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title="Change Password">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input required type="password" placeholder="Current Password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
        <input required type="password" placeholder="New Password" value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} />
        <input required type="password" placeholder="Confirm New Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => { reset(); onClose(); }} className={buttonClasses("ghost", "md")}>Cancel</button>
          <button type="submit" className={buttonClasses("primary", "md")}>Update Password</button>
        </div>
      </form>
    </Modal>
  );
}
