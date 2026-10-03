import type { Response } from "express";
import type { QueryFilter } from "mongoose";
import { SupportTicket, type SupportTicketDocument } from "../models/SupportTicket";
import { Order } from "../models/Order";
import { User } from "../models/User";
import { nextSequence } from "../models/Counter";
import { AppError } from "../utils/AppError";
import { success } from "../utils/response";
import { escapeRegex } from "../utils/slugify";
import type { AuthRequest } from "../middleware/auth.middleware";

const USER_FIELDS = "name email userCode";

function toTicket(t: SupportTicketDocument) {
  const user = t.user as unknown as { _id?: unknown; name?: string; email?: string; userCode?: string };
  return {
    id: t.ticketNumber,
    userId: user?.userCode,
    userName: user?.name ?? "",
    userEmail: user?.email ?? "",
    category: t.category,
    message: t.message,
    orderId: t.orderNumber,
    status: t.status,
    replies: t.replies.map((r) => ({ byRole: r.byRole, authorName: r.authorName, message: r.message, at: r.at })),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

/** The ticket, if the caller owns it or is an admin. */
async function findVisible(req: AuthRequest) {
  const ticket = await SupportTicket.findOne({ ticketNumber: req.params.ticketNumber }).populate("user", USER_FIELDS);
  const ownerId = (ticket?.user as unknown as { _id?: { toString(): string } })?._id?.toString();
  if (!ticket || (req.userRole !== "admin" && ownerId !== req.userId)) {
    throw new AppError("Support request not found", 404, "NOT_FOUND");
  }
  return ticket;
}

export async function createTicket(req: AuthRequest, res: Response) {
  const { category, message, orderId } = req.body;
  if (orderId && !(await Order.exists({ orderNumber: orderId, user: req.userId }))) {
    throw new AppError("That order wasn't found on your account.", 400, "VALIDATION_ERROR");
  }
  const ticket = await SupportTicket.create({
    ticketNumber: `SUP-${await nextSequence("support", 10000)}`,
    user: req.userId,
    category,
    message,
    orderNumber: orderId || undefined,
  });
  await ticket.populate("user", USER_FIELDS);
  success(res, `Support request ${ticket.ticketNumber} submitted`, { ticket: toTicket(ticket) }, 201);
}

export async function listMyTickets(req: AuthRequest, res: Response) {
  const tickets = await SupportTicket.find({ user: req.userId }).sort({ updatedAt: -1 }).limit(200).populate("user", USER_FIELDS);
  success(res, "Support requests fetched", { tickets: tickets.map(toTicket) });
}

export async function getTicket(req: AuthRequest, res: Response) {
  success(res, "Support request fetched", { ticket: toTicket(await findVisible(req)) });
}

/** A reply from the customer reopens a resolved ticket; a reply from the
 * team moves a new ticket into progress. */
export async function replyToTicket(req: AuthRequest, res: Response) {
  const ticket = await findVisible(req);
  const author = await User.findById(req.userId).select("name");
  const isAdmin = req.userRole === "admin";
  ticket.replies.push({
    byRole: req.userRole!,
    authorName: isAdmin ? "Mana Oori Santha Support" : (author?.name ?? "Customer"),
    message: req.body.message,
    at: new Date(),
  });
  if (isAdmin && ticket.status === "open") ticket.status = "in-progress";
  if (!isAdmin && ticket.status === "resolved") ticket.status = "open";
  await ticket.save();
  success(res, "Reply sent", { ticket: toTicket(ticket) });
}

export async function adminListTickets(req: AuthRequest, res: Response) {
  const { status, search } = req.query as Record<string, string | undefined>;
  const filter: QueryFilter<SupportTicketDocument> = {};
  if (status) filter.status = status as SupportTicketDocument["status"];
  if (search) {
    const pattern = new RegExp(escapeRegex(search.trim()), "i");
    const users = await User.find({ $or: [{ name: pattern }, { email: pattern }] }).select("_id");
    filter.$or = [{ ticketNumber: pattern }, { orderNumber: pattern }, { user: { $in: users.map((u) => u._id) } }];
  }
  const tickets = await SupportTicket.find(filter).sort({ updatedAt: -1 }).limit(500).populate("user", USER_FIELDS);
  success(res, "Support requests fetched", { tickets: tickets.map(toTicket) });
}

export async function adminSetTicketStatus(req: AuthRequest, res: Response) {
  const ticket = await findVisible(req);
  ticket.status = req.body.status;
  await ticket.save();
  success(res, "Status updated", { ticket: toTicket(ticket) });
}
