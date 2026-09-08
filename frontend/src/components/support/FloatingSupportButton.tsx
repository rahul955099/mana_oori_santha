import { MessageCircle } from "lucide-react";
import { useSupport } from "@/context/SupportContext";

/** Persistent bottom-right entry point into Customer Support. Sits a little
 * above the corner so it never overlaps toast notifications rendered at
 * bottom-4/bottom-6 in the same corner. */
export function FloatingSupportButton() {
  const { openSupport } = useSupport();

  return (
    <button
      type="button"
      onClick={() => openSupport()}
      aria-label="Customer Support"
      className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-primary-600 px-4 py-3 text-sm font-bold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-2xl active:translate-y-0 sm:bottom-24 sm:right-6"
    >
      <MessageCircle size={18} />
      <span className="hidden sm:inline">Customer Support</span>
    </button>
  );
}
