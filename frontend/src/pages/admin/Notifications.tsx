import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Send, Megaphone } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { buttonClasses } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { api, errorMessage } from "@/lib/api";

const inputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

interface Broadcast {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  /** How many customers have opened it in their notification bell. */
  reads: number;
}

export default function AdminNotifications() {
  const { showToast } = useToast();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setBroadcasts((await api.get<{ broadcasts: Broadcast[] }>("/notifications/broadcasts")).broadcasts);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await api.post<{ broadcast: Broadcast & { emailed: number } }>("/notifications/broadcast", {
        title: title.trim(),
        message: message.trim(),
        email,
      });
      showToast(
        email ? `Sent to all customers and emailed ${res.broadcast.emailed} who opted in to offers.` : "Sent to all customers."
      );
      setTitle("");
      setMessage("");
      setEmail(false);
      await load();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Notifications</h1>
      <p className="mt-1 text-sm text-stone-500">
        Send an offer or announcement to every customer's notification bell. Order, support and seller updates are sent
        automatically.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-xl space-y-4 rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex items-center gap-2 text-sm font-bold text-stone-800">
          <Megaphone size={16} className="text-primary-600" /> New Broadcast
        </div>
        <input required minLength={3} maxLength={100} placeholder="Title (e.g. Weekend Sale!)" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        <textarea required minLength={5} maxLength={1000} rows={3} placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} className={`${inputClass} resize-none`} />
        <label className="flex items-start gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary-600" />
          <span>
            Also email customers who turned on offers in their profile
            <span className="block text-xs text-stone-400">Your email plan's daily limit applies.</span>
          </span>
        </label>
        <button type="submit" disabled={sending} className={buttonClasses("primary", "md")}>
          <Send size={15} /> {sending ? "Sending..." : "Send to All Customers"}
        </button>
      </form>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-stone-900">Sent Broadcasts</h2>
        {broadcasts.length === 0 ? (
          <EmptyState title="No broadcasts sent yet" description="Announcements you send will be listed here." />
        ) : (
          <div className="space-y-3">
            {broadcasts.map((n) => (
              <div key={n.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                <p className="text-sm font-bold text-stone-800">{n.title}</p>
                <p className="mt-1 text-sm text-stone-500">{n.message}</p>
                <p className="mt-2 text-xs text-stone-400">
                  {new Date(n.createdAt).toLocaleString("en-IN")} · read by {n.reads} customer{n.reads === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
