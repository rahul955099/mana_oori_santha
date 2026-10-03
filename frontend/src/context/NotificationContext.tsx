import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppNotification } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

interface NotificationContextValue {
  /** The logged-in user's notifications (own plus customer broadcasts), newest first. */
  notifications: AppNotification[];
  unreadCount: number;
  reload: () => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

/** How often to check for new notifications while the tab is open. */
const POLL_MS = 60_000;

/** Notifications are created by the server when things happen (orders,
 * support replies, approvals); this only reads them and tracks what's read. */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const reload = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    try {
      setNotifications((await api.get<{ notifications: AppNotification[] }>("/notifications")).notifications);
    } catch {
      // Keep the last list; the next poll will try again.
    }
  }, [userId]);

  useEffect(() => {
    // Old demo builds kept notifications in the browser.
    try {
      localStorage.removeItem("mos_notifications");
    } catch {
      // ignore
    }
    void reload();
    if (!userId) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, POLL_MS);
    const onFocus = () => void reload();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [reload, userId]);

  function markAsRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    api.patch(`/notifications/${id}/read`).catch(() => undefined);
  }

  function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    api.post("/notifications/read-all").catch(() => undefined);
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, reload, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
