import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Clock, XCircle, PauseCircle, FileCheck2 } from "lucide-react";
import { useSellerAccount } from "@/context/SellerAccountContext";

/** Tells a seller what's needed before their shop goes live. Renders nothing once approved. */
export function SellerStatusBanner() {
  const { account } = useSellerAccount();
  if (!account || account.status === "approved") return null;

  if (account.status === "pending" && !account.kyc) {
    return (
      <Banner tone="amber" icon={<FileCheck2 size={20} />} title="Complete your seller details to go live">
        Add your PAN and payout (UPI or bank) details so our team can verify your shop. You can add products now — they'll
        appear in the store once you're approved.{" "}
        <Link to="/seller/profile#kyc" className="font-bold underline">
          Add details
        </Link>
      </Banner>
    );
  }
  if (account.status === "pending") {
    return (
      <Banner tone="amber" icon={<Clock size={20} />} title="Your shop is being reviewed">
        Thanks for submitting your details. We usually review new sellers within 1–2 working days. Your products will
        appear in the store once approved.
      </Banner>
    );
  }
  if (account.status === "rejected") {
    return (
      <Banner tone="red" icon={<XCircle size={20} />} title="Your application needs changes">
        {account.statusReason ? `Reason: ${account.statusReason}. ` : ""}Please update your details and resubmit.{" "}
        <Link to="/seller/profile#kyc" className="font-bold underline">
          Update details
        </Link>
      </Banner>
    );
  }
  return (
    <Banner tone="red" icon={<PauseCircle size={20} />} title="Your shop is suspended">
      {account.statusReason ? `Reason: ${account.statusReason}. ` : ""}Your products are hidden from the store. Please
      contact support.
    </Banner>
  );
}

function Banner({ tone, icon, title, children }: { tone: "amber" | "red"; icon: ReactNode; title: string; children: ReactNode }) {
  const colors = tone === "amber" ? "border-accent-200 bg-accent-50 text-accent-800" : "border-red-200 bg-red-50 text-red-800";
  return (
    <div className={`mb-6 flex gap-3 rounded-2xl border p-4 ${colors}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-0.5 text-sm">{children}</p>
      </div>
    </div>
  );
}
