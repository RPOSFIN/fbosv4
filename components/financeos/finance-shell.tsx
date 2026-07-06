"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { financeNavigation, initialFinanceDashboard } from "@/lib/financeos/finance-data";

export function FinanceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#eef3fb] text-slate-900">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[76px_minmax(0,1fr)]">
        <aside className="hidden bg-[#0f4aa2] text-white lg:flex lg:flex-col">
          <div className="border-b border-white/15 px-2 py-4 text-center">
            <div className="mx-auto h-8 w-8 rounded bg-white/15" />
            <p className="mt-2 text-[10px] font-bold leading-tight">FBOS</p>
          </div>
          <nav className="flex-1 space-y-1 px-1 py-3">
            {financeNavigation.map(([label, href]) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} className={active ? "block rounded bg-white px-2 py-2 text-[10px] font-semibold text-[#0f4aa2]" : "block rounded px-2 py-2 text-[10px] text-blue-50 hover:bg-white/10"}>
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="space-y-1 border-t border-white/15 p-2 text-[9px] text-blue-50">
            <p>Supabase ●</p>
            <p>Tally ●</p>
            <p>Sync ready</p>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-blue-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#0f4aa2]">Finance Dashboard</p>
                <h1 className="text-sm font-bold text-slate-900">Finance Complete Dashboard - All Metrics Live</h1>
              </div>
              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                <Badge label={initialFinanceDashboard.financialYear} />
                <Badge label={initialFinanceDashboard.currentMonth} />
                <Badge label="Supabase" tone="green" />
                <Badge label="Tally" tone="blue" />
                <button className="rounded border border-blue-600 bg-blue-600 px-2 py-1 font-semibold text-white">Sync</button>
                <button className="rounded border border-blue-300 bg-white px-2 py-1 text-blue-700">Search</button>
              </div>
            </div>
          </header>
          <main className="p-2 lg:p-3">{children}</main>
        </div>
      </div>
    </div>
  );
}

function Badge({ label, tone = "blue" }: { label: string; tone?: "blue" | "green" }) {
  const cls = tone === "green" ? "border-green-200 bg-green-50 text-green-700" : "border-blue-200 bg-blue-50 text-blue-700";
  return <span className={`rounded border px-2 py-1 font-semibold ${cls}`}>{label}</span>;
}
