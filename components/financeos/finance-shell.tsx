"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { financeNavigation, initialFinanceDashboard } from "@/lib/financeos/finance-data";

export function FinanceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100">
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#070b14]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">FBOS Command Center</div>
            <h1 className="text-2xl font-semibold tracking-tight">FinanceOS</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <StatusPill label={initialFinanceDashboard.financialYear} />
            <StatusPill label={initialFinanceDashboard.currentMonth} />
            <StatusPill label="Last sync: pending" tone="warning" />
            <StatusPill label={`Supabase: ${initialFinanceDashboard.supabaseStatus}`} tone="info" />
            <StatusPill label={`Tally: ${initialFinanceDashboard.tallyStatus}`} tone="warning" />
            <button className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-cyan-100 transition hover:bg-cyan-400/20">Sync</button>
            <div className="hidden min-w-56 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-slate-500 md:block">Quick search</div>
            <span className="rounded-full bg-white/10 px-3 py-2">Notifications</span>
            <span className="rounded-full bg-white/10 px-3 py-2">Profile</span>
          </div>
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-88px)] grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="hidden border-r border-white/10 bg-white/[0.03] p-4 lg:block">
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-sm font-medium">Finance Control</p>
            <p className="text-xs text-slate-500">Clean module navigation</p>
          </div>
          <nav className="space-y-1">
            {financeNavigation.map(([label, href]) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} className={active ? "block rounded-xl border border-cyan-300/30 bg-cyan-300/15 px-3 py-2 text-sm text-cyan-100" : "block rounded-xl px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"}>
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 p-4 lg:p-6">{children}</main>

        <aside className="hidden border-l border-white/10 bg-white/[0.03] p-4 xl:block">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">Right Panel</h2>
          <div className="space-y-3">
            {initialFinanceDashboard.alerts.map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-sm font-semibold text-white">{alert.title}</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">{alert.body}</p>
              </div>
            ))}
            {["Pending approval", "Pending payments", "Pending receipts", "Cash alerts", "Bank alerts"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{item}</span>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-400">0</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "info" | "warning" }) {
  const toneClass = tone === "info" ? "border-blue-300/30 bg-blue-400/10 text-blue-100" : tone === "warning" ? "border-orange-300/30 bg-orange-400/10 text-orange-100" : "border-white/10 bg-white/5 text-slate-300";
  return <span className={`rounded-full border px-3 py-2 ${toneClass}`}>{label}</span>;
}
