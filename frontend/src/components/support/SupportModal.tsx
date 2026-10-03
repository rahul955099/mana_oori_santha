import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MessageCircle, Send, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { buttonClasses } from "@/components/common/Button";
import { useSupport } from "@/context/SupportContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { errorMessage } from "@/lib/api";
import { SUPPORT_CATEGORY_LABELS, type SupportCategory } from "@/types";
import { SUPPORT_PHONE, SUPPORT_EMAIL, SUPPORT_PHONE_TEL_HREF, SUPPORT_EMAIL_MAILTO_HREF } from "@/config/support";

const CATEGORY_ICONS: Record<SupportCategory, string> = {
  "order-issue": "🛒",
  "delivery-issue": "🚚",
  "payment-issue": "💳",
  "product-issue": "📦",
  "return-refund": "↩️",
  "farmer-query": "🌾",
  "account-issue": "👤",
};

const CATEGORIES = Object.keys(SUPPORT_CATEGORY_LABELS) as SupportCategory[];

export function SupportModal() {
  const { isModalOpen, closeSupport, prefill, submitRequest } = useSupport();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [category, setCategory] = useState<SupportCategory | null>(null);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isModalOpen) {
      setCategory(prefill?.category ?? null);
      setMessage("");
      setSubmitted(null);
      setError("");
    }
  }, [isModalOpen, prefill]);

  async function handleSubmit() {
    if (!user || !category || !message.trim()) return;
    setSending(true);
    setError("");
    try {
      const ticket = await submitRequest({ category, message: message.trim(), orderId: prefill?.orderId });
      setSubmitted(ticket.id);
      showToast(`Support request ${ticket.id} submitted. Our team will reach out soon.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal isOpen={isModalOpen} onClose={closeSupport} title="Customer Support">
      {submitted ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 size={40} className="text-primary-600" />
          <p className="text-sm font-bold text-stone-800">Request {submitted} submitted</p>
          <p className="text-sm text-stone-500">
            Our support team will reply soon. You can follow the conversation under Support Requests.
          </p>
          <div className="mt-2 flex gap-2">
            <Link to="/my-support" onClick={closeSupport} className={buttonClasses("ghost", "md")}>
              View my requests
            </Link>
            <button onClick={closeSupport} className={buttonClasses("primary", "md")}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {(prefill?.orderId || prefill?.orderSummary) && (
            <div className="rounded-xl bg-primary-50 px-4 py-3 text-sm">
              {prefill.orderId && (
                <p className="font-bold text-primary-800">Order ID: {prefill.orderId}</p>
              )}
              {prefill.orderSummary && <p className="mt-0.5 text-primary-700">{prefill.orderSummary}</p>}
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">What can we help with?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-center text-xs font-semibold transition ${
                    category === c
                      ? "border-primary-500 bg-primary-50 text-primary-800"
                      : "border-stone-200 text-stone-600 hover:border-primary-300"
                  }`}
                >
                  <span className="text-lg">{CATEGORY_ICONS[c]}</span>
                  {SUPPORT_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          {user ? (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">
                <MessageCircle size={13} className="mr-1 inline" /> Chat with Support
              </p>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue..."
                className="w-full resize-none rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!category || message.trim().length < 5 || sending}
                className={buttonClasses("primary", "md", "mt-3 w-full disabled:opacity-50")}
              >
                <Send size={15} /> {sending ? "Sending..." : "Submit Request"}
              </button>
              {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
            </div>
          ) : (
            <p className="rounded-xl bg-stone-50 px-4 py-3 text-center text-sm text-stone-500">
              <Link to="/login" onClick={closeSupport} className="font-bold text-primary-700 hover:underline">
                Log in
              </Link>{" "}
              to chat with our support team or submit a request.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 border-t border-stone-100 pt-4">
            <a href={SUPPORT_PHONE_TEL_HREF} className="flex flex-col items-center gap-1.5 rounded-xl border border-stone-200 py-3 text-center transition hover:border-primary-300 hover:bg-primary-50">
              <Phone size={17} className="text-primary-600" />
              <span className="text-xs font-bold text-stone-700">Call Support</span>
              <span className="text-[11px] text-stone-400">{SUPPORT_PHONE}</span>
            </a>
            <a href={SUPPORT_EMAIL_MAILTO_HREF} className="flex flex-col items-center gap-1.5 rounded-xl border border-stone-200 py-3 text-center transition hover:border-primary-300 hover:bg-primary-50">
              <Mail size={17} className="text-primary-600" />
              <span className="text-xs font-bold text-stone-700">Email Support</span>
              <span className="text-[11px] text-stone-400">{SUPPORT_EMAIL}</span>
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
}
