"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CommandHeader from "@/components/command-center/command-header";
import MetricCard from "@/components/command-center/metric-card";
import { pageShell, panelPad } from "@/components/command-center/theme";
import { apiFetch } from "@/lib/api/client";

type Lead = {
  id: string;
  company_name?: string;
  status?: string;
  contact_person?: string;
  mobile?: string;
  source?: string;
};

type LeadsPageResponse = {
  leads: Lead[];
  total: number;
};

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
    let active = true;
    (async () => {
      try {
        const [pageRes, statsRes] = await Promise.all([
          apiFetch<LeadsPageResponse>("/api/leads?limit=50"),
          apiFetch<{ total: number; won: number; active: number; lost: number }>(
            "/api/leads/stats"
          ),
        ]);

        if (!active) return;

        const rows = pageRes.leads || [];
        setLeads(rows.slice(0, 20));
        setStats({
          total: statsRes.total,
          won: statsRes.won,
          lost: statsRes.lost,
          active: statsRes.active,
        });
        setError(null);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load leads");
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
    <div className={pageShell}>
      <CommandHeader
        title="Sales Workbench"
        badge="Supabase leads table — single source of truth"
      />

      {error && (
        <p className="mb-4 rounded-lg border border-red-800/50 bg-red-950/20 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Total Leads" value={loading ? "…" : stats.total} accent="blue" />
        <MetricCard label="Won" value={loading ? "…" : stats.won} accent="green" />
        <MetricCard label="Active" value={loading ? "…" : stats.active} accent="orange" />
        <MetricCard label="Lost" value={loading ? "…" : stats.lost} accent="red" />
      </div>

      <div className={`${panelPad} rounded-xl border border-slate-200 bg-white shadow-sm mb-8`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Live Leads</h2>
          <Link href="/lead-master" className="text-sm text-blue-600 hover:underline">
            Open Lead Master →
          </Link>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Loading leads…</p>
        ) : leads.length === 0 ? (
          <p className="text-sm text-slate-500">No leads found in Supabase leads table.</p>
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
                    <td className="py-2 pr-4 font-medium text-slate-800">
                      {lead.company_name || "—"}
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{lead.contact_person || "—"}</td>
                    <td className="py-2 pr-4 text-slate-600">{lead.mobile || "—"}</td>
                    <td className="py-2 pr-4 text-slate-600">{lead.status || "NEW"}</td>
                    <td className="py-2 text-slate-500">{lead.source || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold mb-4 text-slate-800">Sales Modules</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {modules.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="border border-slate-200 rounded-xl p-5 hover:border-cyan-400 bg-white shadow-sm"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
