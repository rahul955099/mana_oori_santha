import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { AuthCard, authInputClass } from "@/components/auth/AuthCard";
import { buttonClasses } from "@/components/common/Button";
import { api, errorMessage } from "@/lib/api";
import { Seo } from "@/components/common/Seo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your account email and we'll send you a link to reset it.">
      <Seo title="Forgot password" noIndex />
      {sent ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck size={40} className="text-primary-600" />
          <p className="text-sm text-stone-600">
            If an account exists for <span className="font-semibold">{email}</span>, a reset link is on its way. It expires in
            30 minutes — check your spam folder if you don't see it.
          </p>
          <Link to="/login" className={buttonClasses("primary", "md", "mt-2")}>
            Back to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-bold text-stone-600">Email</label>
            <input
              id="email"
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={authInputClass}
            />
          </div>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <button type="submit" disabled={submitting} className={buttonClasses("primary", "lg", "w-full")}>
            {submitting ? "Sending..." : "Send Reset Link"}
          </button>
          <p className="text-center text-sm text-stone-500">
            Remembered it?{" "}
            <Link to="/login" className="font-bold text-primary-700 hover:underline">
              Log in
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
