"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccessRoute } from "@/lib/rbac/route-access";
import type { FbosRole } from "@/lib/rbac/permissions";

const workbenchLinks = [
  { name: "CEO Command Center", href: "/ceo-command-center" },
];

const menu = [
  { name: "Master Dashboard", href: "/" },
  { name: "Sales OS", href: "/sales-workbench" },
  { name: "Operations OS", href: "/operations" },
  { name: "Finance (Full Matrix)", href: "/finance-dashboard" },
  { name: "Execution Hub", href: "/execution-board" },
  { name: "Internal Chat", href: "/chat-center" },
  { name: "Knowledge Center", href: "/knowledge-hub" },
  { name: "AI Center", href: "/ai" },
  { name: "Data Center", href: "/data" },
  { name: "Integration Hub", href: "/integrations" },
  { name: "Admin", href: "/admin" },
  { name: "Settings", href: "/fbos-settings" },
];

export default function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const fbosRole = role as FbosRole | undefined;

  const visibleMenu = menu.filter((item) =>
    item.href === "/" ? true : canAccessRoute(fbosRole, item.href)
  );

  const visibleQuick = workbenchLinks.filter((item) =>
    canAccessRoute(fbosRole, item.href)
  );

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white p-4 border-r border-slate-800">
      <h1 className="text-2xl font-bold mb-2">FBOS</h1>
      <p className="text-xs text-slate-400 mb-6">Flexiflair Business OS</p>

      <nav className="space-y-1">
        {visibleMenu.map((item) => (
          <SidebarLink
            key={item.href}
            href={item.href}
            label={item.name}
            active={pathname === item.href}
          />
        ))}
      </nav>

      {visibleQuick.length > 0 && (
        <div className="mt-8 pt-4 border-t border-slate-800">
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
            Quick Access
          </p>
          <div className="space-y-1">
            {visibleQuick.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.name}
                active={pathname === item.href}
              />
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function SidebarLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "block rounded-lg px-3 py-2 text-sm bg-cyan-600"
          : "block rounded-lg px-3 py-2 text-sm hover:bg-slate-800"
      }
    >
      {label}
    </Link>
  );
}
