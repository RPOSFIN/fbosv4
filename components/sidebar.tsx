"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccessRoute } from "@/lib/rbac/route-access";
import type { FbosRole } from "@/lib/rbac/permissions";
import CeoScanButton from "@/components/command-center/ceo-scan-button";

const menu = [
  { name: "Master Dashboard", href: "/", icon: "📊" },
  { name: "Sales & Call Coach", href: "/sales-workbench", icon: "📞" },
  { name: "Operations (Live)", href: "/operations", icon: "⚙️" },
  { name: "Finance (Full Matrix)", href: "/finance-dashboard", icon: "💰" },
  { name: "Execution Hub", href: "/execution-board", icon: "🚀" },
  { name: "Internal Chat", href: "/chat-center", icon: "💬" },
  { name: "Compliance", href: "/compliance", icon: "✓" },
];

const tools = [
  { name: "Integrations", href: "/integrations", icon: "🔗" },
  { name: "Engineering Center", href: "/engineering-center", icon: "🛠️" },
  { name: "Settings", href: "/fbos-settings", icon: "⚙️" },
];

export default function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const fbosRole = role as FbosRole | undefined;

  const visibleMenu = menu.filter((item) =>
    item.href === "/" ? true : canAccessRoute(fbosRole, item.href)
  );

  return (
    <aside className="w-[15rem] shrink-0 min-h-screen bg-white border-r border-slate-200 flex flex-col shadow-sm">
      <div className="p-4 border-b border-slate-200">
        <h1 className="text-xl font-black tracking-wide text-slate-900">FLEXIFLAIR</h1>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">CEO Command Center</p>
        <CeoScanButton />
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <NavSection label="Main" />
        {visibleMenu.map((item) => (
          <SidebarLink key={item.href} {...item} active={pathname === item.href} />
        ))}

        <NavSection label="Tools" />
        {tools.map((item) => (
          <SidebarLink key={item.href} {...item} active={pathname === item.href} />
        ))}
      </nav>

      <p className="px-4 py-3 text-xs text-slate-400 border-t border-slate-100">
        Sync controls are in the top bar per connector.
      </p>
    </aside>
  );
}

function NavSection({ label }: { label: string }) {
  return (
    <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold px-2 mt-4 mb-1.5 first:mt-0">
      {label}
    </p>
  );
}

function SidebarLink({
  href,
  name,
  icon,
  active,
}: {
  href: string;
  name: string;
  icon: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[15px] bg-blue-600 text-white font-semibold shadow-sm"
          : "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[15px] text-slate-700 hover:bg-slate-100 font-medium"
      }
    >
      <span className="text-base">{icon}</span>
      {name}
    </Link>
  );
}
