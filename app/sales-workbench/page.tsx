"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { normalizeLeadStats } from "@/lib/leads/normalize-stats";

type Lead = {
  id: string;
  company_name?: string;
  status?: string;
  contact_person?: string;
  mobile?: string;
  source?: string;
};

type LeadsPagePayload = {
  leads?: Lead[];
  total?: number;
};

function unwrapLeadsPage(payload: unknown): { leads: Lead[]; total: number } {
  if (Array.isArray(payload)) {
    return { leads: payload, total: payload.length };
  }
  if (payload && typeof payload === "object") {
    const obj = payload as LeadsPagePayload & { data?: LeadsPagePayload };
    const inner = obj.data ?? obj;
    const leads = inner.leads ?? [];
    return { leads, total: inner.total ?? leads.length };
  }
  return { leads: [], total: 0 };
}

const modules = [
  ["Lead Master", "/lead-master"],
  ["ClickUp Leads", "/clickup-tasks"],
  ["Import Engine", "/imports"],
  ["Sales Dashboard", "/sales-dashboard"],
  ["Sales Kanban", "/sales-kanban"],
  ["Today's Followup", "/followups/today"],
  ["Followups", "/followups"],
  ["Quotations", "/quotations"],
  ["Clients", "/clients"],
  ["Sales Reports", "/sales-reports"],
  ["Sales Targets", "/sales-targets"],
  ["Sales Activities", "/sales-activities"],
];

export default function SalesWorkbench() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState({ total: 0, won: 0, active: 0, lost: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("WORKBENCH MOUNTED");
    let active = true;
    (async () => {
      try {
        const [leadsResponse, statsResponse] = await Promise.all([
          apiFetch<LeadsPagePayload | Lead[]>("/api/leads?limit=50"),
          apiFetch<unknown>("/api/leads/stats"),
        ]);

        console.log("LEADS RESPONSE", leadsResponse);
        console.log("STATS RESPONSE", statsResponse);
        console.log("RAW RESPONSE", leadsResponse);
        console.log("RAW STATS", statsResponse);

        if (!active) return;

        const page = unwrapLeadsPage(leadsResponse);
        const parsedStats = normalizeLeadStats(statsResponse);
        const rows = page.leads.slice(0, 20);
        const kpi = {
          total: parsedStats?.total ?? 0,
          won: parsedStats?.won ?? 0,
          active: parsedStats?.active ?? 0,
          lost: parsedStats?.lost ?? 0,
        };

        console.log("SETTING KPI", kpi);
        console.log("SETTING LEADS", rows.length);

        setLeads(rows);
        setStats(kpi);
        setError(null);
      } catch (e) {
        console.log("WORKBENCH FETCH ERROR", e);
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load leads");
          console.log("SETTING KPI", { total: 0, won: 0, active: 0, lost: 0 });
          console.log("SETTING LEADS", 0);
          setLeads([]);
          setStats({ total: 0, won: 0, active: 0, lost: 0 });
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
      <h1 className="text-3xl font-bold mb-2">Sales Workbench</h1>
      <p className="text-sm text-slate-500 mb-6">Live data from /api/leads and /api/leads/stats</p>

      {error && (
        <p className="mb-4 rounded-lg border border-red-800/50 bg-red-950/20 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Kpi label="Total Leads" value={loading ? "…" : stats.total} />
        <Kpi label="Won" value={loading ? "…" : stats.won} />
        <Kpi label="Active" value={loading ? "…" : stats.active} />
        <Kpi label="Lost" value={loading ? "…" : stats.lost} />
      </div>

      <div className="border rounded-xl p-4 mb-8 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Live Leads</h2>
          <Link href="/lead-master" className="text-sm text-blue-600 hover:underline">
            Open Lead Master →
          </Link>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Loading leads…</p>
        ) : leads.length === 0 ? (
          <p className="text-sm text-slate-500">No leads found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2 pr-4">Company</th>
                  <th className="py-2 pr-4">Contact</th>
                  <th className="py-2 pr-4">Mobile</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 font-medium">{lead.company_name || "—"}</td>
                    <td className="py-2 pr-4">{lead.contact_person || "—"}</td>
                    <td className="py-2 pr-4">{lead.mobile || "—"}</td>
                    <td className="py-2 pr-4">{lead.status || "NEW"}</td>
                    <td className="py-2">{lead.source || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold mb-4">Sales Modules</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {modules.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="border rounded-xl p-5 hover:border-cyan-400 bg-white shadow-sm"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
