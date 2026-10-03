import { useState } from "react";
import { MailCheck, CheckCircle2, XCircle } from "lucide-react";
import { buttonClasses } from "@/components/common/Button";
import { api, errorMessage } from "@/lib/api";

interface EmailReport {
  to: string;
  configured: boolean;
  host: string | null;
  port: number;
  from: string | null;
  userSet: boolean;
  passwordSet: boolean;
  loginOk: boolean;
  sent: boolean;
  providerResponse: string | null;
  error: string | null;
}

/** Sends a test email to the admin and shows exactly where email setup fails. */
export function EmailCheck() {
  const [report, setReport] = useState<EmailReport | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function run() {
    setChecking(true);
    setError("");
    try {
      setReport(await api.post<EmailReport>("/admin/email-check"));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setChecking(false);
    }
  }

  const row = (ok: boolean, label: string, detail?: string | null) => (
    <li className="flex items-start gap-2">
      {ok ? (
        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary-600" />
      ) : (
        <XCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
      )}
      <span>
        {label}
        {detail && <span className="block break-all text-xs text-stone-500">{detail}</span>}
      </span>
    </li>
  );

  return (
    <div className="mt-8 max-w-xl rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-center gap-2 text-sm font-bold text-stone-800">
        <MailCheck size={16} className="text-primary-600" /> Email Check
      </div>
      <p className="mt-1 text-sm text-stone-500">Sends a test email to your admin address and shows where it fails, if it does.</p>
      <button onClick={run} disabled={checking} className={buttonClasses("ghost", "md", "mt-4")}>
        {checking ? "Checking..." : "Send Test Email"}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {report && (
        <ul className="mt-4 space-y-2 text-sm text-stone-700">
          {row(
            report.configured,
            "Email settings present on the server",
            `Host ${report.host ?? "—"}:${report.port} · From ${report.from ?? "—"} · Login ${report.userSet ? "set" : "missing"} · Key ${report.passwordSet ? "set" : "missing"}`
          )}
          {report.configured && row(report.loginOk, "Logged in to the email service")}
          {report.loginOk &&
            row(report.sent, report.sent ? `Accepted for delivery to ${report.to}` : "Sending failed", report.providerResponse)}
          {report.error && <li className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{report.error}</li>}
          {report.sent && (
            <li className="text-xs text-stone-500">
              If it doesn't arrive within a few minutes, check Spam, and in Brevo check Transactional → Logs and that the
              "From" address is a verified sender.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
