import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { buttonClasses } from "@/components/common/Button";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage, getToken } from "@/lib/api";
import { Seo } from "@/components/common/Seo";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { user, refreshUser } = useAuth();
  const [state, setState] = useState<"checking" | "done" | "failed">("checking");
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    // Tokens are single-use, so make sure a re-render (or StrictMode) doesn't submit twice.
    if (started.current) return;
    started.current = true;
    api
      .post("/auth/verify-email", { token })
      .then(async () => {
        setState("done");
        // Clears the "please confirm" banner if they're logged in on this device.
        if (getToken()) await refreshUser().catch(() => undefined);
      })
      .catch((err) => {
        setError(errorMessage(err));
        setState("failed");
      });
  }, [token, refreshUser]);

  return (
    <AuthCard title="Confirm your email">
      <Seo title="Confirm email" noIndex />
      <div className="flex flex-col items-center gap-3 text-center">
        {state === "checking" && (
          <>
            <Loader2 size={36} className="animate-spin text-primary-600" />
            <p className="text-sm text-stone-500">Confirming...</p>
          </>
        )}
        {state === "done" && (
          <>
            <CheckCircle2 size={40} className="text-primary-600" />
            <p className="text-sm text-stone-600">Your email is confirmed. Thank you!</p>
            <Link to="/" className={buttonClasses("primary", "md", "mt-2")}>
              Continue Shopping
            </Link>
          </>
        )}
        {state === "failed" && (
          <>
            <XCircle size={40} className="text-red-500" />
            <p className="text-sm text-stone-600">{error}</p>
            <Link to={user ? "/profile" : "/login"} className={buttonClasses("primary", "md", "mt-2")}>
              {user ? "Go to Profile" : "Log In"}
            </Link>
          </>
        )}
      </div>
    </AuthCard>
  );
}
