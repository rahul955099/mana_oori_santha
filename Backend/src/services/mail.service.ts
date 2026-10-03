import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Emails "sent" while running tests, so tests can read reset links etc. */
export const testOutbox: MailMessage[] = [];

/** How mail leaves the server. Brevo's HTTPS API is preferred when its key is
 * set, because many hosts (including Render's free plan) block SMTP ports. */
export function mailTransport(): "brevo-api" | "smtp" | null {
  if (!env.smtp.from) return null;
  if (env.brevoApiKey) return "brevo-api";
  const s = env.smtp;
  return s.host && s.user && s.pass ? "smtp" : null;
}

export function mailConfigured(): boolean {
  return mailTransport() !== null;
}

/** "Mana Oori Santha <shop@x.in>" → { name, email }; a bare address works too. */
export function parseAddress(value: string): { name?: string; email: string } {
  const match = value.match(/^\s*"?([^"<]*?)"?\s*<\s*([^>\s]+)\s*>\s*$/);
  if (match) return match[1] ? { name: match[1].trim(), email: match[2] } : { email: match[2] };
  return { email: value.trim() };
}

/** The request body Brevo's transactional email API expects. */
export function brevoPayload(message: MailMessage) {
  return {
    sender: parseAddress(env.smtp.from),
    to: [{ email: message.to }],
    subject: message.subject,
    htmlContent: message.html,
    textContent: message.text,
  };
}

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

/** Sends via Brevo's API. Throws with Brevo's own error message on failure. */
async function sendViaBrevo(message: MailMessage): Promise<string> {
  const res = await fetch(BREVO_SEND_URL, {
    method: "POST",
    headers: { "api-key": env.brevoApiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(brevoPayload(message)),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { messageId?: string; message?: string; code?: string };
  if (!res.ok) {
    throw new Error(`Brevo API ${res.status}${body.code ? ` ${body.code}` : ""}: ${body.message ?? "request failed"}`);
  }
  return `Brevo accepted the message${body.messageId ? ` (${body.messageId})` : ""}`;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
    connectionTimeout: 15_000,
  });
  return transporter;
}

async function deliver(message: MailMessage): Promise<string> {
  if (mailTransport() === "brevo-api") return sendViaBrevo(message);
  const info = await getTransporter().sendMail({ from: env.smtp.from, ...message });
  return String(info.response ?? "sent");
}

/** Addresses that can never receive mail (RFC 2606 / 6761), such as the
 * sample accounts' @example.com. Sending to them only causes bounces, which
 * hurt the sender's reputation with the email provider. */
export function isReservedTestAddress(to: string): boolean {
  const domain = to.split("@")[1]?.toLowerCase() ?? "";
  return /^example\.(com|net|org)$/.test(domain) || /\.(test|example|invalid|localhost|local)$/.test(domain);
}

/** Sends an email without ever failing the request that triggered it: a
 * missed email is logged, not shown to the user as an error. */
export async function sendMail(message: MailMessage): Promise<void> {
  if (env.nodeEnv === "test") {
    testOutbox.push(message);
    return;
  }
  if (!mailConfigured()) {
    console.log(`[mail not configured] To: ${message.to} | ${message.subject}\n${message.text}\n`);
    return;
  }
  if (isReservedTestAddress(message.to)) {
    console.log(`[mail skipped: test address] To: ${message.to} | ${message.subject}`);
    return;
  }
  try {
    await deliver(message);
  } catch (err) {
    console.error(`Email to ${message.to} failed:`, err instanceof Error ? err.message : err);
  }
}

/** For events that shouldn't wait on the mail server. */
export function sendMailInBackground(message: MailMessage): void {
  void sendMail(message);
}

/** Admin troubleshooting: sends one test message and reports the provider's
 * actual answer instead of swallowing errors. Never returns secrets. */
export async function diagnoseMail(to: string) {
  const transport = mailTransport();
  const report = {
    configured: transport !== null,
    transport,
    host: transport === "brevo-api" ? "api.brevo.com (HTTPS)" : env.smtp.host || null,
    port: transport === "brevo-api" ? 443 : env.smtp.port,
    from: env.smtp.from || null,
    userSet: transport === "brevo-api" ? true : Boolean(env.smtp.user),
    passwordSet: transport === "brevo-api" ? Boolean(env.brevoApiKey) : Boolean(env.smtp.pass),
    loginOk: false,
    sent: false,
    providerResponse: null as string | null,
    error: null as string | null,
  };
  if (!transport) {
    report.error = "Email isn't set up on this server: set MAIL_FROM plus either BREVO_API_KEY or SMTP_HOST, SMTP_USER and SMTP_PASS.";
    return report;
  }
  try {
    if (transport === "smtp") await getTransporter().verify();
    report.loginOk = true;
    report.providerResponse = await deliver({
      to,
      subject: "Mana Oori Santha: email check",
      text: "This is a test from the admin panel's email check. If you can read this, email works.",
      html: "<p>This is a test from the admin panel's email check. If you can read this, email works.</p>",
    });
    report.sent = true;
  } catch (err) {
    const e = err as { message?: string; response?: string; code?: string };
    report.error = [e.code, e.response ?? e.message].filter(Boolean).join(": ");
    if (transport === "smtp" && e.code === "ETIMEDOUT") {
      report.error += " — this host blocks SMTP. Set BREVO_API_KEY to send through Brevo's web API instead.";
    }
  }
  return report;
}
