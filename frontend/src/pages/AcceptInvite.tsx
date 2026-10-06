import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
  const { user, initializing, logout, refreshUser, acceptAdminInvite } = useAuth();
  const location = useLocation();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<{ email: string; hasAccount: boolean; role?: "admin" | "delivery" } | null>(null);
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
      .get<{ email: string; hasAccount: boolean; role?: "admin" | "delivery" }>("/auth/admin-invite", { token })
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
    showToast(isDelivery ? "Welcome! Switch on \"Available today\" to start getting deliveries." : result.message);
    navigate(isDelivery ? "/delivery/dashboard" : "/admin/dashboard", { replace: true });
  }

  async function acceptWithAccount() {
    setError("");
    setSubmitting(true);
    try {
      await api.post("/auth/admin-invite/accept-existing", { token });
      await refreshUser();
      showToast("You're now an admin. Welcome to the team!");
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
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

  const isDelivery = invite.role === "delivery";

  if (invite.hasAccount && isDelivery) {
    return (
      <AuthCard title="Use a different email" subtitle={`${invite.email} already has an account on the site.`}>
        <Seo title="Delivery partner invitation" noIndex />
        <p className="text-center text-sm text-stone-600">Delivery partners need their own login. Ask the team to invite a different email address.</p>
      </AuthCard>
    );
  }

  if (invite.hasAccount) {
    const signedInAsInvitee = user?.email === invite.email;
    return (
      <AuthCard title="Join the admin team" subtitle={`You've been invited to be an admin with ${invite.email}.`}>
        <Seo title="Admin invitation" noIndex />
        {initializing ? (
          <div className="flex justify-center py-4">
            <Loader2 size={28} className="animate-spin text-primary-600" />
          </div>
        ) : signedInAsInvitee ? (
          <div className="space-y-4">
            <p className="text-center text-sm text-stone-600">
              Accepting gives your account access to the admin panel: orders, sellers, products and customers.
            </p>
            {error && <p className="text-center text-sm font-medium text-red-600">{error}</p>}
            <button onClick={acceptWithAccount} disabled={submitting} className={buttonClasses("primary", "lg", "w-full")}>
              {submitting ? "Accepting..." : "Accept Invitation"}
            </button>
          </div>
        ) : user ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-stone-600">
              You're logged in as <span className="font-semibold">{user.email}</span>, but this invitation is for{" "}
              <span className="font-semibold">{invite.email}</span>.
            </p>
            <button onClick={logout} className={buttonClasses("primary", "lg", "w-full")}>
              Log Out and Switch Account
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-stone-600">Log in with your existing account to accept.</p>
            <Link to="/login" state={{ from: location }} className={buttonClasses("primary", "lg", "w-full")}>
              Log In to Accept
            </Link>
          </div>
        )}
      </AuthCard>
    );
  }

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value });

  return (
    <AuthCard
      title={isDelivery ? "Become a delivery partner" : "Join the admin team"}
      subtitle={isDelivery ? `Set up your delivery account for ${invite.email}.` : `Set up your admin account for ${invite.email}.`}
    >
      <Seo title={isDelivery ? "Delivery partner invitation" : "Admin invitation"} noIndex />
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
          {submitting ? "Setting up..." : isDelivery ? "Create Delivery Account" : "Create Admin Account"}
        </button>
      </form>
    </AuthCard>
  );
}
