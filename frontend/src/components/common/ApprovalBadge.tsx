import type { ApprovalStatus } from "@/types";
import { Badge } from "@/components/common/Badge";

const LABELS: Record<ApprovalStatus, { label: string; tone: "gold" | "green" | "red" }> = {
  pending: { label: "Pending Approval", tone: "gold" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Rejected", tone: "red" },
};

/** A product's review status. Products from before reviews existed count as approved. */
export function ApprovalBadge({ status }: { status?: ApprovalStatus }) {
  const { label, tone } = LABELS[status ?? "approved"];
  return <Badge tone={tone}>{label}</Badge>;
}
