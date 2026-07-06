"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";

type AuditSample = {
  lead_id?: string;
  company_name?: string | null;
  crm_status?: string | null;
  clickup_task_id?: string | null;
  clickup_name?: string | null;
  clickup_status_raw?: string | null;
  clickup_status_normalized?: string | null;
  external_id?: string | null;
  name?: string | null;
  status?: string | null;
  list_name?: string | null;
  space_name?: string | null;
  synced_at?: string | null;
};

type AuditResponse = {
  summary: Record<string, number>;
  byClickUpStatus: Record<string, number>;
  byNormalizedStatus: Record<string, number>;
  taskFieldAudit: Record<string, number>;
  samples: {
    missing_clickup_task: AuditSample[];
    missing_supabase_lead: AuditSample[];
    status_mismatches: AuditSample[];
  };
  rules: Record<string, string | boolean>;
};

export default function ClickUpDeepAuditPanel() {
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"missing_clickup_task" | "missing_supabase_lead" | "status_mismatches">("status_mismatches");

  const refresh = useCallback(() => {
    setLoading(true);
    setError("");
    apiFetch<AuditResponse>("/api/sales/clickup/deep-audit?limit=50")
      .then(setAudit)
      .catch((err) => {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load ClickUp audit");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rows = audit?.samples?.[tab] || [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b bg-blue-50 px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">CLICKUP MIRROR DEEP AUDIT</h2>
            <p className="text-xs text-slate-600">Supabase is source of truth. ClickUp remains execution mirror only.</p>
          </div>
          <button type="button" onClick={refresh} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50" disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {error && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <AuditStat label="Supabase leads" value={audit?.summary?.supabase_leads || 0} />
          <AuditStat label="ClickUp tasks" value={audit?.summary?.clickup_tasks || 0} />
          <AuditStat label="Status mismatch" value={audit?.summary?.status_mismatch_sample_count || 0} warn />
          <AuditStat label="Missing mirror" value={audit?.summary?.missing_clickup_task_sample_count || 0} warn />
          <AuditStat label="Missing CRM" value={audit?.summary?.missing_supabase_lead_sample_count || 0} warn />
          <AuditStat label="No due date" value={audit?.taskFieldAudit?.missing_due_date || 0} />
          <AuditStat label="No assignee" value={audit?.taskFieldAudit?.missing_assignee || 0} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatusBox title="Normalized Sales Status" data={audit?.byNormalizedStatus || {}} />
          <StatusBox title="Raw ClickUp Status" data={audit?.byClickUpStatus || {}} />
        </div>

        <div className="flex flex-wrap gap-2">
          <TabButton active={tab === "status_mismatches"} onClick={() => setTab("status_mismatches")}>Status mismatches</TabButton>
          <TabButton active={tab === "missing_clickup_task"} onClick={() => setTab("missing_clickup_task")}>Missing ClickUp mirror</TabButton>
          <TabButton active={tab === "missing_supabase_lead"} onClick={() => setTab("missing_supabase_lead")}>Missing Supabase lead</TabButton>
        </div>

        <div className="overflow-auto max-h-[360px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="text-left p-3">Supabase / CRM</th>
                <th className="text-left p-3">CRM Status</th>
                <th className="text-left p-3">ClickUp / Mirror</th>
                <th className="text-left p-3">ClickUp Status</th>
                <th className="text-left p-3">Location</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-sm text-slate-500">No sample rows for this tab.</td></tr>
              ) : rows.map((row, idx) => (
                <tr key={`${tab}-${idx}`} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-medium">{row.company_name || "—"}</td>
                  <td className="p-3 text-xs font-bold text-blue-700">{row.crm_status || "—"}</td>
                  <td className="p-3 font-medium">{row.clickup_name || row.name || "—"}</td>
                  <td className="p-3 text-xs text-slate-600">{row.clickup_status_normalized || row.status || row.clickup_status_raw || "—"}</td>
                  <td className="p-3 text-xs text-slate-500">{[row.space_name, row.list_name].filter(Boolean).join(" / ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          Rule locked: mismatch report is audit-only. Supabase lead conversion/update flow remains the only CRM write path.
        </p>
      </div>
    </div>
  );
}

function AuditStat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
      <p className="text-[11px] uppercase font-semibold text-slate-500">{label}</p>
      <p className={`text-xl font-black ${warn && value ? "text-red-700" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={active ? "rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white" : "rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600"}>{children}</button>;
}

function StatusBox({ title, data }: { title: string; data: Record<string, number> }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <h3 className="mb-2 text-xs font-bold uppercase text-slate-600">{title}</h3>
      <div className="space-y-1">
        {rows.length === 0 ? <p className="text-xs text-slate-500">No data yet.</p> : rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-slate-700">{label}</span>
            <span className="font-black text-slate-900">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
