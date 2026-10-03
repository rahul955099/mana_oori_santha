import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation, type Location } from "react-router-dom";
import { Mail, Lock, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Logo } from "@/components/common/Logo";
import { buttonClasses } from "@/components/common/Button";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.success) {
      showToast(result.message);
      const from = (location.state as { from?: Location } | null)?.from;
      const redirectTo = from ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}` : "/";
      navigate(redirectTo, { replace: true });
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-primary-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 shadow-xl sm:p-10">
        <div className="mb-8 flex justify-center">
          <Logo size={44} />
        </div>
        <h1 className="text-center text-2xl font-extrabold text-stone-900">Welcome Back</h1>
        <p className="mt-1 text-center text-sm text-stone-500">Login to continue shopping natural &amp; traditional foods.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-stone-600">Email</label>
            <div className="relative">
              <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-stone-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-stone-600">Password</label>
            <div className="relative">
              <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-stone-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className={buttonClasses("primary", "lg", "w-full")}>
            <LogIn size={18} /> {submitting ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          Don't have an account?{" "}
          <Link to="/register" className="font-bold text-primary-700 hover:underline">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
