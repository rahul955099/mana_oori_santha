/**
 * Sends one test email to check the SMTP settings in .env.
 *
 *   npm run mail:test -- you@example.com
 */
// This script doesn't touch the database or log anyone in.
process.env.MONGODB_URI ||= "unused";
process.env.JWT_SECRET ||= "unused";

import { env } from "../config/env";
import { mailConfigured, sendMail } from "../services/mail.service";
import { esc } from "../services/emailTemplates";

async function main() {
  const to = process.argv[2];
  if (!to || !/^\S+@\S+\.\S+$/.test(to)) {
    console.error("Usage: npm run mail:test -- you@example.com");
    process.exit(1);
  }
  if (!mailConfigured()) {
    console.error("Email isn't configured: set SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM in .env");
    process.exit(1);
  }
  await sendMail({
    to,
    subject: "Mana Oori Santha: test email",
    text: `This is a test email from Mana Oori Santha. If you can read this, email is set up correctly.\n\nSent via ${env.smtp.host}.`,
    html: `<p>This is a test email from <b>Mana Oori Santha</b>.</p><p>If you can read this, email is set up correctly.</p><p style="color:#78716c;font-size:12px">Sent via ${esc(env.smtp.host)}.</p>`,
  });
  console.log(`Sent to ${to}. Check the inbox (and spam folder).`);
}

void main();
