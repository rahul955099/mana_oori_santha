import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthCard, authInputClass } from "@/components/auth/AuthCard";
import { buttonClasses } from "@/components/common/Button";
import { Seo } from "@/components/common/Seo";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, errorMessage } from "@/lib/api";

/** Where an invited admin sets up their account from the emailed link. */
export default function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { acceptAdminInvite } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<{ email: string; hasAccount: boolean } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!/^[a-f0-9]{64}$/.test(token)) {
      setLoadError("This invitation link is incomplete or broken.");
      return;
    }
    api
      .get<{ email: string; hasAccount: boolean }>("/auth/admin-invite", { token })
      .then(setInvite)
      .catch((err) => setLoadError(errorMessage(err)));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setError("");
    setSubmitting(true);
    const result = await acceptAdminInvite(token, { name: form.name.trim(), phone: form.phone.trim(), password: form.password });
    setSubmitting(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    showToast(result.message);
    navigate("/admin/dashboard", { replace: true });
  }

  if (loadError) {
    return (
      <AuthCard title="Invitation not valid" subtitle={loadError}>
        <Seo title="Admin invitation" noIndex />
        <Link to="/" className={buttonClasses("primary", "lg", "w-full")}>
          Go to the Store
        </Link>
      </AuthCard>
    );
  }

  if (!invite) {
    return (
      <AuthCard title="Admin invitation">
        <Seo title="Admin invitation" noIndex />
        <div className="flex justify-center py-6">
          <Loader2 size={32} className="animate-spin text-primary-600" />
        </div>
      </AuthCard>
    );
  }

  if (invite.hasAccount) {
    return (
      <AuthCard title="You already have an account" subtitle={`An account already exists for ${invite.email}.`}>
        <Seo title="Admin invitation" noIndex />
        <p className="text-center text-sm text-stone-600">
          Ask the admin who invited you to add this email from the Team page — your existing account will get admin access.
        </p>
      </AuthCard>
    );
  }

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value });

  return (
    <AuthCard title="Join the admin team" subtitle={`Set up your admin account for ${invite.email}.`}>
      <Seo title="Admin invitation" noIndex />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-xs font-bold text-stone-600">Your name</label>
          <input id="name" required minLength={2} autoComplete="name" value={form.name} onChange={set("name")} className={authInputClass} />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-xs font-bold text-stone-600">Mobile number</label>
          <input
            id="phone"
            required
            type="tel"
            pattern="[6-9][0-9]{9}"
            title="10-digit mobile number"
            autoComplete="tel"
            value={form.phone}
            onChange={set("phone")}
            className={authInputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-bold text-stone-600">Password</label>
          <input id="password" required minLength={6} type="password" autoComplete="new-password" value={form.password} onChange={set("password")} className={authInputClass} />
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-xs font-bold text-stone-600">Confirm password</label>
          <input id="confirm" required minLength={6} type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} className={authInputClass} />
        </div>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <button type="submit" disabled={submitting} className={buttonClasses("primary", "lg", "w-full")}>
          {submitting ? "Setting up..." : "Create Admin Account"}
        </button>
      </form>
    </AuthCard>
  );
}
