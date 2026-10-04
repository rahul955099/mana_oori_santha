import type { Request, Response } from "express";
import { User } from "../models/User";
import { AdminInvite } from "../models/AdminInvite";
import { AdminActivity, type AdminAction } from "../models/AdminActivity";
import { AppError } from "../utils/AppError";
import { success } from "../utils/response";
import { signToken } from "../utils/jwt";
import { createOneTimeToken, hashToken } from "../utils/tokens";
import { toSafeUser } from "../utils/serialize";
import { sendMailInBackground } from "../services/mail.service";
import { notifyUser } from "../services/notification.service";
import { adminInviteEmail, adminRemovedEmail, siteLink } from "../services/emailTemplates";
import type { AuthRequest } from "../middleware/auth.middleware";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function actorOf(req: AuthRequest) {
  const actor = await User.findById(req.userId).select("name email");
  return { name: actor?.name ?? "An admin", email: actor?.email ?? "" };
}

async function record(req: AuthRequest, action: AdminAction, targetEmail: string) {
  const actor = await actorOf(req);
  await AdminActivity.create({ action, actorName: actor.name, actorEmail: actor.email, targetEmail });
}

/** Creates a fresh invite token and emails it. */
async function sendInvite(req: AuthRequest, email: string) {
  const { raw, hash } = createOneTimeToken();
  const invite = await AdminInvite.create({
    email,
    tokenHash: hash,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    invitedBy: req.userId,
  });
  const actor = await actorOf(req);
  const hasAccount = !!(await User.exists({ email }));
  sendMailInBackground({ to: email, ...adminInviteEmail(actor.name, siteLink(`/accept-invite?token=${raw}`), hasAccount) });
  return invite;
}

function openInviteFilter() {
  return { acceptedAt: { $exists: false }, cancelledAt: { $exists: false }, expiresAt: { $gt: new Date() } };
}

/** Admins, pending invitations and recent changes, for the Team page. */
export async function getTeam(req: AuthRequest, res: Response) {
  const [admins, invites, activity] = await Promise.all([
    User.find({ role: "admin", isActive: true }).sort({ createdAt: 1 }).select("name email userCode createdAt"),
    AdminInvite.find(openInviteFilter()).sort({ createdAt: -1 }).populate("invitedBy", "name"),
    AdminActivity.find().sort({ createdAt: -1 }).limit(50),
  ]);
  success(res, "Team fetched", {
    admins: admins.map((a) => ({
      id: a._id.toString(),
      name: a.name,
      email: a.email,
      userCode: a.userCode,
      since: a.createdAt,
      isYou: a._id.equals(req.userId!),
    })),
    invites: invites.map((i) => ({
      id: i._id.toString(),
      email: i.email,
      invitedBy: (i.invitedBy as unknown as { name?: string })?.name ?? "",
      sentAt: i.createdAt,
      expiresAt: i.expiresAt,
    })),
    activity: activity.map((a) => ({
      id: a._id.toString(),
      action: a.action,
      actorName: a.actorName,
      targetEmail: a.targetEmail,
      at: a.createdAt,
    })),
  });
}

/** Invites someone to be an admin. Nobody gets admin access until they accept:
 * existing customers log in and accept, new people set up an account. */
export async function addAdmin(req: AuthRequest, res: Response) {
  const email = String(req.body.email);
  const user = await User.findOne({ email });

  if (user) {
    if (!user.isActive) {
      throw new AppError("This account is blocked or deleted. Unblock it first, or invite a different email.", 400, "ACCOUNT_INACTIVE");
    }
    if (user.role === "admin") {
      throw new AppError(`${email} is already an admin.`, 409, "ALREADY_ADMIN");
    }
    if (user.role === "seller") {
      throw new AppError(
        "This email belongs to a seller's shop account. Use a different email for admin access, so selling and running the site stay separate.",
        400,
        "SELLER_ACCOUNT"
      );
    }
  }

  // Everyone, including people who already have an account, must accept before
  // getting admin access, so a mistyped email can't hand it to a stranger.
  if (await AdminInvite.exists({ email, ...openInviteFilter() })) {
    throw new AppError("An invitation to this email is already waiting. Use Resend if they can't find it.", 409, "INVITE_PENDING");
  }
  await sendInvite(req, email);
  await record(req, "admin.invited", email);
  if (user) {
    await notifyUser(user._id, {
      type: "account",
      title: "You've been invited to be an admin",
      message: "Open the invitation email to accept.",
    });
  }
  success(res, `Invitation sent to ${email}.`, { added: false, invited: true }, 201);
}

/** Takes admin access away (the account stays, as a customer). Never removes the last admin. */
export async function removeAdmin(req: AuthRequest, res: Response) {
  const user = await User.findOne({ _id: req.params.userId, role: "admin" });
  if (!user) {
    throw new AppError("Admin not found", 404, "NOT_FOUND");
  }
  const others = await User.countDocuments({ role: "admin", isActive: true, _id: { $ne: user._id } });
  if (others === 0) {
    throw new AppError("You can't remove the last admin. Add another admin first.", 400, "LAST_ADMIN");
  }

  user.role = "customer";
  await user.save();
  await record(req, "admin.removed", user.email);
  sendMailInBackground({ to: user.email, ...adminRemovedEmail(user.name) });
  // requireAuth re-reads the role on every request, so access ends immediately.
  success(res, user._id.equals(req.userId!) ? "You're no longer an admin." : `${user.name} is no longer an admin.`, {
    removedSelf: user._id.equals(req.userId!),
  });
}

export async function resendInvite(req: AuthRequest, res: Response) {
  const invite = await AdminInvite.findOne({ _id: req.params.inviteId, acceptedAt: { $exists: false }, cancelledAt: { $exists: false } });
  if (!invite) {
    throw new AppError("Invitation not found", 404, "NOT_FOUND");
  }
  // Replace the old link so only the newest email works.
  invite.cancelledAt = new Date();
  await invite.save();
  await sendInvite(req, invite.email);
  await record(req, "admin.invite-resent", invite.email);
  success(res, `Invitation re-sent to ${invite.email}.`);
}

export async function cancelInvite(req: AuthRequest, res: Response) {
  const invite = await AdminInvite.findOneAndUpdate(
    { _id: req.params.inviteId, acceptedAt: { $exists: false }, cancelledAt: { $exists: false } },
    { cancelledAt: new Date() }
  );
  if (!invite) {
    throw new AppError("Invitation not found", 404, "NOT_FOUND");
  }
  await record(req, "admin.invite-cancelled", invite.email);
  success(res, `Invitation to ${invite.email} cancelled.`);
}

async function findValidInvite(token: string) {
  const invite = await AdminInvite.findOne({ tokenHash: hashToken(token), ...openInviteFilter() });
  if (!invite) {
    throw new AppError("This invitation is invalid, already used, or has expired. Ask an admin to send a new one.", 400, "INVALID_TOKEN");
  }
  return invite;
}

/** Public: lets the accept page show which email the invitation is for. */
export async function previewInvite(req: Request, res: Response) {
  const invite = await findValidInvite(String(req.query.token));
  const hasAccount = !!(await User.exists({ email: invite.email }));
  success(res, "Invitation is valid", { email: invite.email, hasAccount });
}

/** Public: completes an invitation by creating the admin account and logging them in. */
export async function acceptInvite(req: Request, res: Response) {
  const invite = await findValidInvite(req.body.token);
  if (await User.exists({ email: invite.email })) {
    // Someone signed up with this email after being invited; an admin can upgrade that account instead.
    throw new AppError(
      "An account with this email already exists. Ask an admin to add it from the Team page instead.",
      409,
      "DUPLICATE_EMAIL"
    );
  }

  const user = await User.create({
    name: req.body.name,
    email: invite.email,
    phone: req.body.phone,
    password: req.body.password,
    role: "admin",
    // The link arrived in their inbox, which proves they own the address.
    emailVerified: true,
  });
  invite.acceptedAt = new Date();
  await invite.save();
  await AdminActivity.create({
    action: "admin.invite-accepted",
    actorName: user.name,
    actorEmail: user.email,
    targetEmail: user.email,
  });

  const token = signToken({ userId: user._id.toString(), role: user.role });
  success(res, "Welcome to the team!", { token, user: toSafeUser(user) }, 201);
}

/** Logged in: the invited person accepts with the account they already have. */
export async function acceptInviteAsExisting(req: AuthRequest, res: Response) {
  const invite = await findValidInvite(req.body.token);
  const user = await User.findById(req.userId);
  if (!user || user.email !== invite.email) {
    throw new AppError(`This invitation is for ${invite.email}. Log in with that account to accept it.`, 403, "WRONG_ACCOUNT");
  }
  if (user.role === "seller") {
    throw new AppError("Seller shop accounts can't become admins. Ask for an invitation to a different email.", 400, "SELLER_ACCOUNT");
  }
  if (user.role !== "admin") {
    user.role = "admin";
    await user.save();
  }
  invite.acceptedAt = new Date();
  await invite.save();
  await AdminActivity.create({
    action: "admin.invite-accepted",
    actorName: user.name,
    actorEmail: user.email,
    targetEmail: user.email,
  });
  success(res, "You're now an admin. Welcome to the team!", { user: toSafeUser(user) });
}
