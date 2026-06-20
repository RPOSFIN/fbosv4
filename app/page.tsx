"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";

type DashboardKpi = {
  leads: number;
  followups: number;
  followupsToday: number;
  jobs: number;
  financeQueue: number;
  clickupTasks: number;
};

export default function Page() {
  const [kpi, setKpi] = useState<DashboardKpi>({
    leads: 0,
    followups: 0,
    followupsToday: 0,
    jobs: 0,
    financeQueue: 0,
    clickupTasks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<DashboardKpi>("/api/dashboard/kpi");
        if (active) {
          setKpi({
            leads: data.leads ?? 0,
            followups: data.followups ?? 0,
            followupsToday: data.followupsToday ?? 0,
            jobs: data.jobs ?? 0,
            financeQueue: data.financeQueue ?? 0,
            clickupTasks: data.clickupTasks ?? 0,
          });
          setError("");
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load dashboard");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">FBOS Dashboard</h1>
      <p className="text-slate-400 text-sm mb-6">Live counts from Supabase</p>

      {error && <p className="text-red-400 mb-4">{error}</p>}
      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard label="Leads" value={kpi.leads} href="/lead-master" />
          <KpiCard
            label="Followups"
            value={kpi.followups}
            href="/followups"
            sub={`${kpi.followupsToday} due today`}
          />
          <KpiCard label="Jobs" value={kpi.jobs} href="/job-master" />
          <KpiCard
            label="Finance Queue"
            value={kpi.financeQueue}
            href="/finance"
          />
          <KpiCard
            label="ClickUp Tasks"
            value={kpi.clickupTasks}
            href="/integrations"
          />
        </div>
      )}
    </div>
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
  href: string;
  sub?: string;
}) {
  return (
    <Link
      href={href}
      className="border border-slate-700 p-4 rounded-xl hover:border-cyan-500/40 transition-colors"
    >
      <h2 className="text-sm text-slate-400">{label}</h2>
      <p className="text-4xl font-bold mt-1">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </Link>
  );
}
