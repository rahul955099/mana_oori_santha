import { useState, type FormEvent } from "react";
import { Send, Megaphone } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";
import { useToast } from "@/context/ToastContext";
import { buttonClasses } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";

const inputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

export default function AdminNotifications() {
  const { notifications, broadcastToAll } = useNotifications();
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  // Broadcasts sent from this admin session that are visible to the admin's own
  // notification feed too (userId "all" matches every account, admin included).
  const sentBroadcasts = notifications.filter((n) => n.type === "offer");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    broadcastToAll({ type: "offer", title: title.trim(), message: message.trim() });
    showToast("Offer sent to all customers.");
    setTitle("");
    setMessage("");
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Notifications</h1>
      <p className="mt-1 text-sm text-stone-500">
        Send an important offer/announcement to every customer's notification bell.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-xl space-y-4 rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex items-center gap-2 text-sm font-bold text-stone-800">
          <Megaphone size={16} className="text-primary-600" /> New Broadcast
        </div>
        <input required placeholder="Title (e.g. Weekend Sale!)" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        <textarea required rows={3} placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} className={`${inputClass} resize-none`} />
        <button type="submit" className={buttonClasses("primary", "md")}>
          <Send size={15} /> Send to All Customers
        </button>
      </form>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-stone-900">Sent Broadcasts</h2>
        {sentBroadcasts.length === 0 ? (
          <EmptyState title="No broadcasts sent yet" description="Announcements you send will be listed here." />
        ) : (
          <div className="space-y-3">
            {sentBroadcasts.map((n) => (
              <div key={n.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                <p className="text-sm font-bold text-stone-800">{n.title}</p>
                <p className="mt-1 text-sm text-stone-500">{n.message}</p>
                <p className="mt-2 text-xs text-stone-400">{new Date(n.createdAt).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
