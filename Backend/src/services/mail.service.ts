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

let transporter: Transporter | null = null;

export function mailConfigured(): boolean {
  const s = env.smtp;
  return Boolean(s.host && s.user && s.pass && s.from);
}

function getTransporter(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
  return transporter;
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
    await getTransporter().sendMail({ from: env.smtp.from, ...message });
  } catch (err) {
    console.error(`Email to ${message.to} failed:`, err instanceof Error ? err.message : err);
  }
}

/** For events that shouldn't wait on the mail server. */
export function sendMailInBackground(message: MailMessage): void {
  void sendMail(message);
}

/** Admin troubleshooting: checks the SMTP login and sends one test message,
 * reporting the provider's actual answer instead of swallowing errors.
 * Never returns the password. */
export async function diagnoseMail(to: string) {
  const report = {
    configured: mailConfigured(),
    host: env.smtp.host || null,
    port: env.smtp.port,
    from: env.smtp.from || null,
    userSet: Boolean(env.smtp.user),
    passwordSet: Boolean(env.smtp.pass),
    loginOk: false,
    sent: false,
    providerResponse: null as string | null,
    error: null as string | null,
  };
  if (!report.configured) {
    report.error = "Email isn't set up on this server: SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM must all be set.";
    return report;
  }
  try {
    await getTransporter().verify();
    report.loginOk = true;
    const info = await getTransporter().sendMail({
      from: env.smtp.from,
      to,
      subject: "Mana Oori Santha: email check",
      text: "This is a test from the admin panel's email check. If you can read this, email works.",
    });
    report.sent = true;
    report.providerResponse = String(info.response ?? "");
  } catch (err) {
    const e = err as { message?: string; response?: string; code?: string };
    report.error = [e.code, e.response ?? e.message].filter(Boolean).join(": ");
  }
  return report;
}
