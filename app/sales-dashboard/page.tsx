"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";

export default function SalesDashboard() {
  const [kpi, setKpi] = useState({
    leads: 0,
    followups: 0,
    followupsToday: 0,
    quotations: 0,
    clients: 0,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<{
          leads: number;
          followups: number;
          followupsToday: number;
          quotations: number;
          clients: number;
        }>("/api/dashboard/kpi");
        if (active) {
          setKpi({
            leads: data.leads,
            followups: data.followups,
            followupsToday: data.followupsToday ?? 0,
            quotations: data.quotations,
            clients: data.clients,
          });
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Sales Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="border p-4 rounded-xl">
          <h2 className="text-sm text-slate-400">Total Leads</h2>
          <h1 className="text-4xl font-bold">{kpi.leads}</h1>
        </div>
        <Link
          href="/followups/today"
          className="border border-cyan-500/40 p-4 rounded-xl hover:border-cyan-400 transition-colors"
        >
          <h2 className="text-sm text-cyan-400">Today&apos;s Followups</h2>
          <h1 className="text-4xl font-bold text-cyan-300">{kpi.followupsToday}</h1>
          <p className="text-xs text-slate-500 mt-1">Overdue + today + backlog</p>
        </Link>
        <div className="border p-4 rounded-xl">
          <h2 className="text-sm text-slate-400">All Followups</h2>
          <h1 className="text-4xl font-bold">{kpi.followups}</h1>
        </div>
        <div className="border p-4 rounded-xl">
          <h2 className="text-sm text-slate-400">Quotations</h2>
          <h1 className="text-4xl font-bold">{kpi.quotations}</h1>
        </div>
        <div className="border p-4 rounded-xl">
          <h2 className="text-sm text-slate-400">Clients</h2>
          <h1 className="text-4xl font-bold">{kpi.clients}</h1>
        </div>
      </div>
    </div>
  );
}
