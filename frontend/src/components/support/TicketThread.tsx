import { useState } from "react";
import { Send } from "lucide-react";
import { useSupport } from "@/context/SupportContext";
import { useToast } from "@/context/ToastContext";
import { buttonClasses } from "@/components/common/Button";
import { errorMessage } from "@/lib/api";
import { SUPPORT_CATEGORY_LABELS, type SupportRequest } from "@/types";

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/** A support request as a conversation, with a reply box. */
export function TicketThread({ ticket, viewer }: { ticket: SupportRequest; viewer: "customer" | "admin" }) {
  const { reply } = useSupport();
  const { showToast } = useToast();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    setSending(true);
    try {
      await reply(ticket.id, message.trim());
      setMessage("");
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setSending(false);
    }
  }

  const bubbles = [
    { byRole: "customer" as const, authorName: ticket.userName, message: ticket.message, at: ticket.createdAt },
    ...ticket.replies,
  ];

  return (
    <div>
      <p className="mb-3 text-xs text-stone-500">
        {SUPPORT_CATEGORY_LABELS[ticket.category]}
        {ticket.orderId && <> · Order {ticket.orderId}</>}
      </p>
      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
        {bubbles.map((b, i) => {
          const fromTeam = b.byRole === "admin";
          const mine = viewer === "admin" ? fromTeam : !fromTeam;
          return (
            <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "bg-primary-600 text-white" : "bg-stone-100 text-stone-700"}`}>
                <p className={`mb-0.5 text-[11px] font-bold ${mine ? "text-primary-100" : "text-stone-500"}`}>
                  {b.authorName} · {when(b.at)}
                </p>
                <p className="whitespace-pre-wrap">{b.message}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <textarea
          rows={2}
          maxLength={2000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={viewer === "admin" ? "Reply to the customer..." : "Add a message..."}
          className="w-full resize-none rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-[11px] text-stone-400">
            {viewer === "customer" && ticket.status === "resolved"
              ? "Replying will reopen this request."
              : viewer === "admin" && ticket.status === "open"
                ? "Replying marks this request as in progress."
                : ""}
          </p>
          <button
            onClick={handleSend}
            disabled={message.trim().length < 5 || sending}
            className={buttonClasses("primary", "sm", "disabled:opacity-50")}
          >
            <Send size={14} /> {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
