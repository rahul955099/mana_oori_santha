import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthCard, authInputClass } from "@/components/auth/AuthCard";
import { buttonClasses } from "@/components/common/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Seo } from "@/components/common/Seo";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { resetPassword } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setError("");
    setSubmitting(true);
    const result = await resetPassword(token, password);
    setSubmitting(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    showToast(result.message);
    navigate("/", { replace: true });
  }

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return (
      <AuthCard title="Link not valid" subtitle="This password reset link is incomplete or broken.">
        <Seo title="Reset password" noIndex />
        <Link to="/forgot-password" className={buttonClasses("primary", "lg", "w-full")}>
          Request a New Link
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" subtitle="You'll be logged in once it's saved. Other devices will be logged out.">
      <Seo title="Reset password" noIndex />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-bold text-stone-600">New password</label>
          <input
            id="password"
            required
            minLength={6}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
          />
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-xs font-bold text-stone-600">Confirm new password</label>
          <input
            id="confirm"
            required
            minLength={6}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={authInputClass}
          />
        </div>
        {error && (
          <p className="text-sm font-medium text-red-600">
            {error}{" "}
            {error.includes("expired") && (
              <Link to="/forgot-password" className="font-bold underline">
                Get a new link
              </Link>
            )}
          </p>
        )}
        <button type="submit" disabled={submitting} className={buttonClasses("primary", "lg", "w-full")}>
          {submitting ? "Saving..." : "Save New Password"}
        </button>
      </form>
    </AuthCard>
  );
}
