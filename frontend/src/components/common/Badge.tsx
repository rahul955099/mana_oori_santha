import type { ReactNode } from "react";

type BadgeTone = "green" | "gold" | "red" | "gray" | "blue";

const tones: Record<BadgeTone, string> = {
  green: "bg-primary-100 text-primary-700",
  gold: "bg-accent-100 text-accent-800",
  red: "bg-red-100 text-red-700",
  gray: "bg-stone-100 text-stone-600",
  blue: "bg-blue-100 text-blue-700",
};

export function Badge({ tone = "gray", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}
