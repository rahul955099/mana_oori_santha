import type { LucideIcon } from "lucide-react";
import { PackageSearch } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon = PackageSearch, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
        <Icon size={28} className="text-stone-400" />
      </div>
      <h3 className="text-lg font-semibold text-stone-800">{title}</h3>
      {description && <p className="max-w-sm text-sm text-stone-500">{description}</p>}
      {action}
    </div>
  );
}
