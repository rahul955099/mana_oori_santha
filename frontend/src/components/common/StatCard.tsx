import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "primary" | "accent" | "earth" | "blue";
}

const tones = {
  primary: "bg-primary-100 text-primary-700",
  accent: "bg-accent-100 text-accent-700",
  earth: "bg-earth-100 text-earth-700",
  blue: "bg-blue-100 text-blue-700",
};

export function StatCard({ icon: Icon, label, value, tone = "primary" }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs font-semibold text-stone-500">{label}</p>
        <p className="text-xl font-extrabold text-stone-900">{value}</p>
      </div>
    </div>
  );
}
