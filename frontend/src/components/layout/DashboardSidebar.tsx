import { NavLink, Link, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { LogOut, Store as StoreIcon } from "lucide-react";
import { LogoMark } from "@/components/common/Logo";
import { useAuth } from "@/context/AuthContext";

export interface SidebarLink {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface DashboardSidebarProps {
  title: string;
  subtitle: string;
  links: SidebarLink[];
}

export function DashboardSidebar({ title, subtitle, links }: DashboardSidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-stone-200 bg-white">
      <Link to="/" className="flex items-center gap-2.5 border-b border-stone-100 px-5 py-5">
        <LogoMark size={32} />
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-extrabold text-primary-700">{title}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">{subtitle}</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to.endsWith("dashboard")}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                isActive ? "bg-primary-600 text-white shadow-sm" : "text-stone-600 hover:bg-primary-50 hover:text-primary-700"
              }`
            }
          >
            <link.icon size={17} />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-stone-100 p-4">
        <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-stone-50 px-3 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <StoreIcon size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-stone-800">{user?.name ?? "Guest"}</p>
            <p className="truncate text-[11px] text-stone-400">{user?.shopName ?? user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate("/"); }}
          className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </aside>
  );
}
