import type { ReactNode } from "react";
import { Logo } from "@/components/common/Logo";

/** The centred card used by login, sign-up and account-recovery pages. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-primary-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 shadow-xl sm:p-10">
        <div className="mb-8 flex justify-center">
          <Logo size={44} />
        </div>
        <h1 className="text-center text-2xl font-extrabold text-stone-900">{title}</h1>
        {subtitle && <p className="mt-1 text-center text-sm text-stone-500">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export const authInputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";
