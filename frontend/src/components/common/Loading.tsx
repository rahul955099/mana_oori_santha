import { Loader2 } from "lucide-react";

export function Loading({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-stone-500">
      <Loader2 className="animate-spin text-primary-600" size={32} />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
