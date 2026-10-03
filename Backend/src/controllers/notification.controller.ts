import type { Response } from "express";
import { Types, type QueryFilter } from "mongoose";
import { Notification, type NotificationDocument } from "../models/Notification";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { success } from "../utils/response";
import { sendMail } from "../services/mail.service";
import { offerEmail } from "../services/emailTemplates";
import type { AuthRequest } from "../middleware/auth.middleware";

const PAGE = 50;

function toNotification(n: NotificationDocument, userId: string) {
  const read = n.audience ? n.readBy.some((id) => id.equals(userId)) : !!n.readAt;
  return {
    id: n._id.toString(),
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    read,
    createdAt: n.createdAt,
  };
}

/** What this user can see: their own notifications, plus customer broadcasts
 * sent since they joined (customers only). */
async function visibleFilter(req: AuthRequest): Promise<QueryFilter<NotificationDocument>> {
  const user = await User.findById(req.userId).select("createdAt role");
  const own = { user: new Types.ObjectId(req.userId) };
  if (user?.role !== "customer") return own;
  return { $or: [own, { audience: "customers" as const, createdAt: { $gte: user.createdAt } }] };
}

export async function listMyNotifications(req: AuthRequest, res: Response) {
  const filter = await visibleFilter(req);
  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(PAGE);
  const items = notifications.map((n) => toNotification(n, req.userId!));
  success(res, "Notifications fetched", { notifications: items, unreadCount: items.filter((n) => !n.read).length });
}

export async function markRead(req: AuthRequest, res: Response) {
  const n = await Notification.findById(req.params.id);
  const mine = n && (n.user?.equals(req.userId!) || (n.audience === "customers" && req.userRole === "customer"));
  if (!n || !mine) throw new AppError("Notification not found", 404, "NOT_FOUND");
  if (n.audience) await Notification.updateOne({ _id: n._id }, { $addToSet: { readBy: new Types.ObjectId(req.userId) } });
  else if (!n.readAt) await Notification.updateOne({ _id: n._id }, { readAt: new Date() });
  success(res, "Marked as read");
}

export async function markAllRead(req: AuthRequest, res: Response) {
  const userId = new Types.ObjectId(req.userId);
  await Notification.updateMany({ user: userId, readAt: { $exists: false } }, { readAt: new Date() });
  if (req.userRole === "customer") {
    await Notification.updateMany({ audience: "customers" }, { $addToSet: { readBy: userId } });
  }
  success(res, "All marked as read");
}

/** Admin: an offer or announcement for every customer's bell, optionally
 * emailed to customers who opted in to offers. */
export async function broadcast(req: AuthRequest, res: Response) {
  const { title, message, email } = req.body;
  const n = await Notification.create({ audience: "customers", type: "offer", title, message, link: "/products" });

  let emailed = 0;
  if (email) {
    const recipients = await User.find({ role: "customer", isActive: true, "notificationPrefs.promotions": true }).select("name email");
    emailed = recipients.length;
    // Sent one by one in the background so the admin isn't kept waiting.
    void (async () => {
      for (const r of recipients) await sendMail({ to: r.email, ...offerEmail(r.name, title, message) });
    })();
  }
  success(
    res,
    email ? `Sent to all customers and emailed ${emailed} who opted in to offers` : "Sent to all customers",
    { broadcast: { id: n._id.toString(), title, message, createdAt: n.createdAt, emailed } },
    201
  );
}

export async function listBroadcasts(_req: AuthRequest, res: Response) {
  const items = await Notification.find({ audience: "customers" }).sort({ createdAt: -1 }).limit(100);
  success(res, "Broadcasts fetched", {
    broadcasts: items.map((n) => ({ id: n._id.toString(), title: n.title, message: n.message, createdAt: n.createdAt, reads: n.readBy.length })),
  });
}
