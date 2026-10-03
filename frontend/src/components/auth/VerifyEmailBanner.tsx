import { useState } from "react";
import { MailWarning } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

/** Reminds a logged-in user to confirm their email, with a resend button. */
export function VerifyEmailBanner() {
  const { user, resendVerification } = useAuth();
  const { showToast } = useToast();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user || user.emailVerified) return null;

  async function handleResend() {
    setSending(true);
    const result = await resendVerification();
    setSending(false);
    showToast(result.message, result.success ? "success" : "error");
    if (result.success) setSent(true);
  }

  return (
    <div className="border-b border-accent-200 bg-accent-50" role="status">
      <div className="container-app flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-xs text-accent-800 sm:text-sm">
        <MailWarning size={16} className="shrink-0" />
        <span>
          Please confirm your email <span className="font-semibold">{user.email}</span> so we can send you order updates.
        </span>
        {sent ? (
          <span className="font-semibold">Link sent — check your inbox.</span>
        ) : (
          <button onClick={handleResend} disabled={sending} className="font-bold underline disabled:opacity-60">
            {sending ? "Sending..." : "Resend link"}
          </button>
        )}
      </div>
    </div>
  );
}
