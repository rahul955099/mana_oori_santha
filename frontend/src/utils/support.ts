import type { SupportRequestStatus } from "@/types";
import type { BadgeTone } from "@/utils/orderStatus";

export const SUPPORT_STATUS: Record<SupportRequestStatus, { label: string; tone: BadgeTone }> = {
  open: { label: "Open", tone: "red" },
  "in-progress": { label: "In Progress", tone: "gold" },
  resolved: { label: "Resolved", tone: "green" },
};
