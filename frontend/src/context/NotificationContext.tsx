import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppNotification, NotificationType } from "@/types";
import { useAuth } from "@/context/AuthContext";

const BROADCAST_ID = "all";

interface NotifyInput {
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string;
}

interface NotificationContextValue {
  /** Notifications for the current logged-in user (own + broadcasts), newest first. */
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  notifyUser: (userId: string, input: NotifyInput) => void;
  broadcastToAll: (input: NotifyInput) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);
const STORAGE_KEY = "mos_notifications";

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [all, setAll] = useState<AppNotification[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AppNotification[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }, [all]);

  function notifyUser(userId: string, input: NotifyInput) {
    const notification: AppNotification = {
      ...input,
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setAll((prev) => [notification, ...prev]);
  }

  function broadcastToAll(input: NotifyInput) {
    notifyUser(BROADCAST_ID, input);
  }

  function markAsRead(id: string) {
    setAll((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllAsRead() {
    if (!user) return;
    setAll((prev) =>
      prev.map((n) => (n.userId === user.userId || n.userId === BROADCAST_ID ? { ...n, read: true } : n)),
    );
  }

  const notifications = useMemo(() => {
    if (!user) return [];
    return all
      .filter((n) => n.userId === user.userId || n.userId === BROADCAST_ID)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [all, user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, notifyUser, broadcastToAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
