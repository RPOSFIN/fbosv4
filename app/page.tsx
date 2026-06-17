"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import type { IntegrationDisplayStatus } from "@/lib/integrations/types";

type IntegrationSummary = {
  gsheet: IntegrationDisplayStatus;
  clickup: IntegrationDisplayStatus;
  tally: IntegrationDisplayStatus;
};

type DashboardKpi = {
  leads: number;
  followups: number;
  followupsToday: number;
  quotations: number;
  clients: number;
  jobs: number;
  integrations?: IntegrationSummary;
};

export default function Page() {
  const [kpi, setKpi] = useState<DashboardKpi>({
    leads: 0,
    followups: 0,
    followupsToday: 0,
    quotations: 0,
    clients: 0,
    jobs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<DashboardKpi>("/api/dashboard/kpi");
        if (active) setKpi(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const modules = [
    { name: "Sales OS", href: "/sales-workbench", metric: `${kpi.leads} leads` },
    { name: "Operations OS", href: "/operations", metric: `${kpi.jobs} jobs` },
    { name: "Finance OS", href: "/finance", metric: "Receivables / Payables" },
    { name: "CEO Command", href: "/ceo-command-center", metric: "Strategic view" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold">FBOS Master Dashboard</h1>
          <p className="mt-2 text-slate-400">
            Flexiflair Business Operating System
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs items-center">
          {loading ? (
            <span className="text-slate-500 animate-pulse">Loading integrations…</span>
          ) : (
            <>
              <StatusPill
                label="GSheet"
                status={kpi.integrations?.gsheet ?? "pending"}
              />
              <StatusPill
                label="ClickUp"
                status={kpi.integrations?.clickup ?? "pending"}
              />
              <StatusPill
                label="Tally"
                status={kpi.integrations?.tally ?? "pending"}
              />
            </>
          )}
          <Link
            href="/integrations"
            className="rounded-full border border-cyan-500/40 px-3 py-1 text-cyan-400 hover:border-cyan-400"
          >
            Integration Hub →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-8">
        <KpiCard label="Leads" value={kpi.leads} />
        <KpiCard
          label="Today's Followups"
          value={kpi.followupsToday}
          href="/followups/today"
          sub={`${kpi.followups} total in system`}
        />
        <KpiCard label="Quotations" value={kpi.quotations} />
        <KpiCard label="Clients" value={kpi.clients} />
        <KpiCard label="Jobs" value={kpi.jobs} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {modules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="border border-cyan-500/40 rounded-xl p-5 hover:border-cyan-400 hover:bg-slate-900/50 transition-colors"
          >
            <div className="text-lg font-semibold">{module.name}</div>
            <div className="mt-2 text-sm text-slate-400">{module.metric}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}

function KpiCard({
  label,
  value,
  href,
  sub,
}: {
  label: string;
  value: number;
  href?: string;
  sub?: string;
}) {
  const inner = (
    <>
      <div className="text-sm text-slate-400">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="border border-slate-800 rounded-xl p-4 bg-slate-900/40 hover:border-cyan-500/40 transition-colors block"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/40">
      {inner}
    </div>
  );
}

function StatusPill({
  label,
  status,
}: {
  label: string;
  status: IntegrationDisplayStatus;
}) {
  const styles: Record<IntegrationDisplayStatus, string> = {
    connected: "border-green-500/40 text-green-400",
    pending: "border-amber-500/40 text-amber-400",
    error: "border-red-500/40 text-red-400",
    demo: "border-cyan-500/40 text-cyan-400",
  };
  const labels: Record<IntegrationDisplayStatus, string> = {
    connected: "Ready",
    pending: "Pending",
    error: "Error",
    demo: "Demo",
  };

  return (
    <span className={`rounded-full border px-3 py-1 ${styles[status]}`}>
      {label}: {labels[status]}
    </span>
  );
}
