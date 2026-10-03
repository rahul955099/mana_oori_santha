import { useState } from "react";
import { LifeBuoy, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useSupport } from "@/context/SupportContext";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { Badge } from "@/components/common/Badge";
import { buttonClasses } from "@/components/common/Button";
import { TicketThread } from "@/components/support/TicketThread";
import { formatDate } from "@/utils/format";
import { SUPPORT_STATUS } from "@/utils/support";
import { SUPPORT_CATEGORY_LABELS } from "@/types";

export default function MySupport() {
  const { requests, loading, openSupport } = useSupport();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading && requests.length === 0) return <Loading label="Loading your requests..." />;

  return (
    <div className="container-app py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold text-stone-900">Support Requests</h1>
        <button onClick={() => openSupport()} className={buttonClasses("primary", "md")}>
          <Plus size={16} /> New Request
        </button>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title="No support requests"
          description="If something goes wrong with an order, raise a request and our team will help."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((t) => {
            const isOpen = expanded === t.id;
            const lastReply = t.replies.at(-1);
            return (
              <div key={t.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                <button
                  onClick={() => setExpanded(isOpen ? null : t.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-stone-900">
                      {t.id} · {SUPPORT_CATEGORY_LABELS[t.category]}
                    </p>
                    <p className="truncate text-xs text-stone-400">
                      Opened {formatDate(t.createdAt)}
                      {lastReply?.byRole === "admin" && " · New reply from support"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={SUPPORT_STATUS[t.status].tone}>{SUPPORT_STATUS[t.status].label}</Badge>
                    {isOpen ? <ChevronUp size={18} className="text-stone-400" /> : <ChevronDown size={18} className="text-stone-400" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-stone-100 p-5">
                    <TicketThread ticket={t} viewer="customer" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
