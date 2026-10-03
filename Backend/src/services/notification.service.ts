import type { Types } from "mongoose";
import { Notification, type NotificationType } from "../models/Notification";
import { User, type NotificationPrefs } from "../models/User";
import { sendMailInBackground } from "./mail.service";

export interface NotifyInput {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/** Shows an in-app notification and, if given and the user's email
 * preference allows it, sends an email too. Never throws: notifying is a
 * side effect and must not fail the action that caused it. */
export async function notifyUser(
  userId: Types.ObjectId | string,
  input: NotifyInput,
  email?: { content: EmailContent; pref?: keyof NotificationPrefs }
): Promise<void> {
  try {
    await Notification.create({ user: userId, ...input });
    if (!email) return;
    const user = await User.findById(userId).select("email isActive notificationPrefs");
    if (!user?.isActive) return;
    if (email.pref && user.notificationPrefs?.[email.pref] === false) return;
    sendMailInBackground({ to: user.email, ...email.content });
  } catch (err) {
    console.error("Notification failed:", err instanceof Error ? err.message : err);
  }
}

export async function notifyAdmins(input: NotifyInput): Promise<void> {
  const admins = await User.find({ role: "admin", isActive: true }).select("_id");
  await Promise.all(admins.map((a) => notifyUser(a._id, input)));
}
