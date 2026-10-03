import { env } from "../config/env";
import type { OrderDocument, OrderStatus } from "../models/Order";

const BRAND = "Mana Oori Santha";
const GREEN = "#2f6f2a";

/** Escapes text placed inside HTML (customer names, messages, product names). */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const rupees = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const siteLink = (path: string) => `${env.clientUrl.replace(/\/$/, "")}${path}`;

interface Email {
  subject: string;
  html: string;
  text: string;
}

/** One simple, email-client-safe layout (tables + inline styles). */
function layout(opts: { heading: string; intro: string; body?: string; button?: { label: string; url: string }; footnote?: string }) {
  const button = opts.button
    ? `<p style="margin:24px 0"><a href="${esc(opts.button.url)}" style="background:${GREEN};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;display:inline-block">${esc(opts.button.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f6f4ef;font-family:Arial,Helvetica,sans-serif;color:#292524">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef;padding:24px 0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:${GREEN};padding:18px 28px;color:#ffffff;font-size:18px;font-weight:bold">${BRAND}</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:20px">${esc(opts.heading)}</h1>
<p style="margin:0 0 12px;font-size:15px;line-height:1.5">${opts.intro}</p>
${opts.body ?? ""}${button}
${opts.footnote ? `<p style="margin:16px 0 0;font-size:12px;color:#78716c;line-height:1.5">${opts.footnote}</p>` : ""}
</td></tr>
<tr><td style="padding:16px 28px;background:#fafaf9;font-size:12px;color:#a8a29e">Fresh from local farmers · ${BRAND}</td></tr>
</table></td></tr></table></body></html>`;
}

export function verifyEmail(name: string, url: string): Email {
  return {
    subject: `Confirm your email for ${BRAND}`,
    html: layout({
      heading: `Welcome, ${name}!`,
      intro: "Please confirm your email address so we can send you order updates and help you recover your account.",
      button: { label: "Confirm email", url },
      footnote: "This link expires in 24 hours. If you didn't create an account, you can ignore this email.",
    }),
    text: `Welcome, ${name}!\n\nConfirm your email address: ${url}\n\nThis link expires in 24 hours. If you didn't create an account, ignore this email.`,
  };
}

export function passwordReset(name: string, url: string): Email {
  return {
    subject: `Reset your ${BRAND} password`,
    html: layout({
      heading: "Reset your password",
      intro: `Hi ${esc(name)}, we received a request to reset your password.`,
      button: { label: "Choose a new password", url },
      footnote: "This link expires in 30 minutes and can be used once. If you didn't ask for this, you can ignore this email — your password won't change.",
    }),
    text: `Hi ${name},\n\nReset your password: ${url}\n\nThis link expires in 30 minutes. If you didn't ask for this, ignore this email.`,
  };
}

export function orderPlaced(name: string, order: OrderDocument): Email {
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #f5f5f4">${esc(i.name)} <span style="color:#a8a29e">× ${i.quantity}</span></td><td align="right" style="padding:6px 0;border-bottom:1px solid #f5f5f4">${rupees(i.price * i.quantity)}</td></tr>`
    )
    .join("");
  const totals = [
    ["Subtotal", rupees(order.subtotal)],
    ...(order.discount ? [[`Discount${order.couponCode ? ` (${esc(order.couponCode)})` : ""}`, `-${rupees(order.discount)}`]] : []),
    ["Delivery", order.deliveryCharge ? rupees(order.deliveryCharge) : "FREE"],
  ]
    .map(([k, v]) => `<tr><td style="padding:4px 0;color:#78716c">${k}</td><td align="right" style="padding:4px 0">${v}</td></tr>`)
    .join("");
  const body = `<table role="presentation" width="100%" style="font-size:14px;margin-top:8px">${rows}${totals}
<tr><td style="padding:8px 0;font-weight:bold">Total (cash on delivery)</td><td align="right" style="padding:8px 0;font-weight:bold">${rupees(order.total)}</td></tr></table>`;
  return {
    subject: `Order ${order.orderNumber} placed`,
    html: layout({
      heading: `Thanks for your order, ${name}!`,
      intro: `We've received order <b>${esc(order.orderNumber)}</b>. We'll let you know as it moves along.`,
      body,
      button: { label: "View your order", url: siteLink("/my-orders") },
    }),
    text: `Thanks for your order, ${name}!\n\nOrder ${order.orderNumber}: ${order.items.length} item(s), total ${rupees(order.total)} (cash on delivery).\n\nTrack it: ${siteLink("/my-orders")}`,
  };
}

const STATUS_COPY: Partial<Record<OrderStatus, { title: string; line: string }>> = {
  confirmed: { title: "Order confirmed", line: "The farmer has confirmed your order and is preparing it." },
  "out-for-delivery": { title: "Out for delivery", line: "Your order is on its way. Please keep the cash ready." },
  delivered: { title: "Delivered", line: "Your order has been delivered. Enjoy! You can now review the products you received." },
  cancelled: { title: "Order cancelled", line: "Your order has been cancelled." },
  returned: { title: "Return approved", line: "Your return has been approved. Any amount you paid will be refunded." },
};

/** Status changes worth an email (the rest are in-app only). */
export function orderStatusEmail(name: string, order: OrderDocument, status: OrderStatus, wasReturnRejected: boolean): Email | null {
  const copy = wasReturnRejected
    ? { title: "Return request update", line: "After review, we couldn't accept the return for this order. Please contact support if you have questions." }
    : STATUS_COPY[status];
  if (!copy) return null;
  return {
    subject: `${copy.title}: ${order.orderNumber}`,
    html: layout({
      heading: copy.title,
      intro: `Hi ${esc(name)}, an update on order <b>${esc(order.orderNumber)}</b>: ${copy.line}`,
      button: { label: "View your order", url: siteLink("/my-orders") },
    }),
    text: `Hi ${name},\n\nOrder ${order.orderNumber}: ${copy.line}\n\n${siteLink("/my-orders")}`,
  };
}

export function supportReply(name: string, ticketNumber: string, message: string): Email {
  return {
    subject: `Reply to your support request ${ticketNumber}`,
    html: layout({
      heading: "Our team replied",
      intro: `Hi ${esc(name)}, here's the latest on request <b>${esc(ticketNumber)}</b>:`,
      body: `<blockquote style="margin:0;padding:12px 16px;background:#f5f5f4;border-radius:12px;font-size:14px;white-space:pre-wrap">${esc(message)}</blockquote>`,
      button: { label: "Reply or view", url: siteLink("/my-support") },
    }),
    text: `Hi ${name},\n\nReply to ${ticketNumber}:\n\n${message}\n\n${siteLink("/my-support")}`,
  };
}

export function sellerStatusEmail(name: string, shop: string, status: string, reason?: string): Email | null {
  const copy: Record<string, { title: string; line: string }> = {
    approved: { title: "Your shop is live!", line: `Good news — ${esc(shop)} has been approved. Your products are now visible to customers.` },
    rejected: { title: "Your seller application needs changes", line: `We couldn't approve ${esc(shop)} yet.${reason ? ` Reason: ${esc(reason)}.` : ""} Please update your details and resubmit.` },
    suspended: { title: "Your shop has been suspended", line: `${esc(shop)} is suspended and its products are hidden.${reason ? ` Reason: ${esc(reason)}.` : ""} Please contact support.` },
  };
  const c = copy[status];
  if (!c) return null;
  return {
    subject: c.title,
    html: layout({ heading: c.title, intro: `Hi ${esc(name)}, ${c.line}`, button: { label: "Open seller panel", url: siteLink("/seller/dashboard") } }),
    text: `Hi ${name},\n\n${c.title}\n${c.line.replace(/<[^>]+>/g, "")}\n\n${siteLink("/seller/dashboard")}`,
  };
}

export function payoutEmail(name: string, amount: number, reference: string): Email {
  return {
    subject: `Payout of ${rupees(amount)} sent`,
    html: layout({
      heading: "You've been paid",
      intro: `Hi ${esc(name)}, we've sent you <b>${rupees(amount)}</b> (reference ${esc(reference)}). It should reach your account shortly.`,
      button: { label: "View earnings", url: siteLink("/seller/earnings") },
    }),
    text: `Hi ${name},\n\nWe've sent you ${rupees(amount)} (reference ${reference}).\n\n${siteLink("/seller/earnings")}`,
  };
}

export function offerEmail(name: string, title: string, message: string): Email {
  return {
    subject: title,
    html: layout({
      heading: title,
      intro: `Hi ${esc(name)},`,
      body: `<p style="font-size:15px;line-height:1.5;white-space:pre-wrap">${esc(message)}</p>`,
      button: { label: "Shop now", url: siteLink("/products") },
      footnote: `You're receiving this because you turned on offers in your ${BRAND} profile. You can turn them off there anytime.`,
    }),
    text: `Hi ${name},\n\n${title}\n\n${message}\n\nShop: ${siteLink("/products")}\n\nTurn off offer emails in your profile.`,
  };
}
