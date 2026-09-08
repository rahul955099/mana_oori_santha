import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { DashboardSidebar, type SidebarLink } from "@/components/layout/DashboardSidebar";

interface DashboardLayoutProps {
  title: string;
  subtitle: string;
  links: SidebarLink[];
}

export function DashboardLayout({ title, subtitle, links }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-stone-50">
      <div className="hidden lg:block">
        <DashboardSidebar title={title} subtitle={subtitle} links={links} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-stone-900/50" onClick={() => setMobileOpen(false)} />
          <div className="relative">
            <DashboardSidebar title={title} subtitle={subtitle} links={links} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setMobileOpen((v) => !v)} className="rounded-lg p-2 text-stone-600 hover:bg-stone-100">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="text-sm font-bold text-primary-700">{title}</span>
        </div>
        <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
