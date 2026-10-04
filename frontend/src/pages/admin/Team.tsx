import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, ShieldCheck, Mail, RotateCw, X, Trash2, History, Crown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Loading } from "@/components/common/Loading";
import { Modal } from "@/components/common/Modal";
import { Badge } from "@/components/common/Badge";
import { buttonClasses } from "@/components/common/Button";
import { api, errorMessage } from "@/lib/api";
import { formatDate } from "@/utils/format";

interface TeamAdmin {
  id: string;
  name: string;
  email: string;
  userCode: string;
  since: string;
  isYou: boolean;
  isOwner: boolean;
}

interface TeamInvite {
  id: string;
  email: string;
  invitedBy: string;
  sentAt: string;
  expiresAt: string;
}

interface TeamActivity {
  id: string;
  action: string;
  actorName: string;
  targetEmail: string;
  at: string;
}

interface TeamData {
  admins: TeamAdmin[];
  invites: TeamInvite[];
  activity: TeamActivity[];
}

const ACTION_TEXT: Record<string, string> = {
  "admin.added": "made {target} an admin",
  "admin.invited": "invited {target}",
  "admin.invite-resent": "re-sent the invitation to {target}",
  "admin.invite-cancelled": "cancelled the invitation to {target}",
  "admin.invite-accepted": "accepted the invitation and joined",
  "admin.removed": "removed admin access from {target}",
  "customer.deleted": "deleted the customer account {target}",
  "owner.transferred": "made {target} the site owner",
};

function describe(a: TeamActivity) {
  return (ACTION_TEXT[a.action] ?? a.action).replace("{target}", a.targetEmail);
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Owner only: who can run the site. Add people by email, remove access, hand over ownership, see history. */
export default function AdminTeam() {
  const { refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamAdmin | null>(null);
  const [ownerTarget, setOwnerTarget] = useState<TeamAdmin | null>(null);

  const load = useCallback(async () => {
    try {
      setTeam(await api.get<TeamData>("/admin/team"));
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      await api.post("/admin/team", { email: email.trim() });
      showToast(`Invitation sent to ${email.trim()}. They'll become an admin once they accept.`);
      setEmail("");
      await load();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setAdding(false);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    const target = removeTarget;
    setRemoveTarget(null);
    try {
      await api.delete(`/admin/team/${target.id}`);
      if (target.isYou) {
        showToast("You're no longer an admin.", "info");
        await refreshUser();
        navigate("/", { replace: true });
        return;
      }
      showToast(`${target.name} is no longer an admin.`);
      await load();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  async function confirmTransfer() {
    if (!ownerTarget) return;
    const target = ownerTarget;
    setOwnerTarget(null);
    try {
      await api.post("/admin/team/transfer-ownership", { userId: target.id });
      showToast(`${target.name} is now the site owner.`);
      await refreshUser();
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  async function inviteAction(invite: TeamInvite, action: "resend" | "cancel") {
    try {
      if (action === "resend") await api.post(`/admin/team/invites/${invite.id}/resend`);
      else await api.delete(`/admin/team/invites/${invite.id}`);
      showToast(action === "resend" ? `Invitation re-sent to ${invite.email}.` : `Invitation to ${invite.email} cancelled.`);
      await load();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }

  if (!team) return <Loading label="Loading team..." />;


  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Admin Team</h1>
      <p className="mt-1 text-sm text-stone-500">
        People who can run the site. You are the owner: only you can change this team, see sellers' full bank details and
        record payouts. Other admins handle orders, products, sellers and customers. Invite someone by email: they become an admin only after they accept.
      </p>

      <form onSubmit={handleAdd} className="mt-6 flex max-w-xl flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row">
        <label htmlFor="admin-email" className="sr-only">
          Email of the new admin
        </label>
        <input
          id="admin-email"
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="min-w-0 flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
        <button type="submit" disabled={adding} className={buttonClasses("primary", "md")}>
          <UserPlus size={16} /> {adding ? "Sending..." : "Send Invitation"}
        </button>
      </form>
      <p className="mt-2 max-w-xl text-xs text-stone-400">
        Admins can see every order and customer. Only add people you trust.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-stone-900">
            <ShieldCheck size={18} className="text-primary-600" /> Admins ({team.admins.length})
          </h2>
          <ul className="divide-y divide-stone-100">
            {team.admins.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-stone-800">
                    {a.name} {a.isOwner && <Badge tone="gold">Owner</Badge>} {a.isYou && <Badge tone="green">You</Badge>}
                  </p>
                  <p className="truncate text-xs text-stone-400">
                    {a.email} · {a.userCode}
                  </p>
                </div>
                {!a.isOwner && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => setOwnerTarget(a)}
                      title="Make site owner"
                      aria-label={`Make ${a.name} the site owner`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-amber-50 hover:text-amber-600"
                    >
                      <Crown size={15} />
                    </button>
                    <button
                      onClick={() => setRemoveTarget(a)}
                      title="Remove admin access"
                      aria-label={`Remove admin access from ${a.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-stone-400">The owner can't be removed. To step down, make another admin the owner first.</p>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-stone-900">
            <Mail size={18} className="text-primary-600" /> Pending Invitations ({team.invites.length})
          </h2>
          {team.invites.length === 0 ? (
            <p className="py-4 text-sm text-stone-400">No invitations waiting.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {team.invites.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-stone-800">{i.email}</p>
                    <p className="text-xs text-stone-400">
                      Invited by {i.invitedBy} · expires {formatDate(i.expiresAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => inviteAction(i, "resend")}
                      title="Resend invitation"
                      aria-label={`Resend invitation to ${i.email}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-primary-50 hover:text-primary-700"
                    >
                      <RotateCw size={15} />
                    </button>
                    <button
                      onClick={() => inviteAction(i, "cancel")}
                      title="Cancel invitation"
                      aria-label={`Cancel invitation to ${i.email}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-stone-900">
          <History size={18} className="text-primary-600" /> Activity
        </h2>
        {team.activity.length === 0 ? (
          <p className="py-4 text-sm text-stone-400">No changes yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {team.activity.map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 border-b border-stone-50 pb-2 last:border-0">
                <span className="text-stone-700">
                  <span className="font-semibold">{a.actorName}</span> {describe(a)}
                </span>
                <span className="text-xs text-stone-400">{when(a.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal isOpen={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove Admin Access">
        <p className="text-sm text-stone-600">
          Remove admin access from {removeTarget?.name}? Their account stays as a normal customer account, and they lose access to the
          admin panel immediately.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setRemoveTarget(null)} className={buttonClasses("ghost", "sm")}>
            Cancel
          </button>
          <button onClick={confirmRemove} className={buttonClasses("danger", "sm")}>
            Remove Access
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!ownerTarget} onClose={() => setOwnerTarget(null)} title="Hand Over Ownership">
        <p className="text-sm text-stone-600">
          Make {ownerTarget?.name} the site owner? They will manage the admin team, see sellers' full bank details and record
          payouts. You stay an admin but lose those owner rights, and only {ownerTarget?.name} can give them back.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setOwnerTarget(null)} className={buttonClasses("ghost", "sm")}>
            Cancel
          </button>
          <button onClick={confirmTransfer} className={buttonClasses("primary", "sm")}>
            Make Owner
          </button>
        </div>
      </Modal>
    </div>
  );
}
