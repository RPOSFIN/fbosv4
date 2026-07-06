"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";

type QualityFilter = "all" | "missing_mobile" | "missing_contact" | "missing_email" | "missing_company" | "has_mobile";

type QualityLead = {
  id: string;
  company_name?: string | null;
  contact_person?: string | null;
  mobile?: string | null;
  clean_mobile?: string | null;
  email?: string | null;
  status?: string | null;
  source?: string | null;
};

type QualityResponse = {
  stats: {
    total_leads: number;
    missing_mobile: number;
    missing_contact_person: number;
    missing_email: number;
    missing_company: number;
    leads_with_mobile: number;
  };
  leads: QualityLead[];
  total: number;
  filter: QualityFilter;
};

const filters: Array<[QualityFilter, string]> = [
  ["all", "All"],
  ["missing_mobile", "Missing mobile"],
  ["missing_contact", "Missing contact"],
  ["missing_email", "Missing email"],
  ["missing_company", "Missing company"],
  ["has_mobile", "Has mobile"],
];

const emptyStats = {
  total_leads: 0,
  missing_mobile: 0,
  missing_contact_person: 0,
  missing_email: 0,
  missing_company: 0,
  leads_with_mobile: 0,
};

export default function SalesDataQualityPanel({ onLeadUpdated }: { onLeadUpdated?: () => void }) {
  const [filter, setFilter] = useState<QualityFilter>("missing_mobile");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState(emptyStats);
  const [leads, setLeads] = useState<QualityLead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ contact_person: "", mobile: "", email: "" });
  const [message, setMessage] = useState("");

  const refresh = useCallback(() => {
    const params = new URLSearchParams({ filter, limit: "50" });
    if (search.trim()) params.set("search", search.trim());

    setLoading(true);
    setError("");
    apiFetch<QualityResponse>(`/api/sales/data-quality?${params.toString()}`)
      .then((res) => {
        setStats(res.stats || emptyStats);
        setLeads(res.leads || []);
        setTotal(res.total || 0);
      })
      .catch((err) => {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load data quality report");
      })
      .finally(() => setLoading(false));
  }, [filter, search]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function startEdit(lead: QualityLead) {
    setEditingId(lead.id);
    setMessage("");
    setDraft({
      contact_person: lead.contact_person || "",
      mobile: lead.mobile || "",
      email: lead.email || "",
    });
  }

  async function saveLead(id: string) {
    setSavingId(id);
    setError("");
    setMessage("");
    try {
      await apiFetch("/api/sales/data-quality", {
        method: "PATCH",
        body: JSON.stringify({ id, ...draft }),
      });
      setEditingId(null);
      setMessage("Lead contact updated. Followup actions will use fresh Supabase CRM data.");
      refresh();
      onLeadUpdated?.();
      window.dispatchEvent(new Event("sales:lead-contact-updated"));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update lead contact");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b bg-amber-50 px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">SALES DATA QUALITY</h2>
            <p className="text-xs text-slate-600">Contact data blocker report. Supabase CRM remains source of truth.</p>
          </div>
          <button type="button" onClick={refresh} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50" disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {error && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
        {message && <p className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{message}</p>}
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <QualityStat label="Total" value={stats.total_leads} />
          <QualityStat label="Missing mobile" value={stats.missing_mobile} warn />
          <QualityStat label="Missing contact" value={stats.missing_contact_person} warn />
          <QualityStat label="Missing email" value={stats.missing_email} warn />
          <QualityStat label="Missing company" value={stats.missing_company} />
          <QualityStat label="Has mobile" value={stats.leads_with_mobile} good />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value as QualityFilter)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
            {filters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company/contact/mobile/email" className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-xs" />
        </div>

        <p className="text-xs font-semibold text-slate-500">Showing {leads.length} of {total} matching leads</p>

        <div className="overflow-auto max-h-[360px]">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-xs uppercase sticky top-0">
              <tr>
                <th className="text-left p-3">Company</th>
                <th className="text-left p-3">Contact</th>
                <th className="text-left p-3">Mobile</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-sm text-slate-500">No leads found for this filter.</td></tr>
              ) : leads.map((lead) => {
                const isEditing = editingId === lead.id;
                return (
                  <tr key={lead.id} className="border-t border-slate-100 hover:bg-slate-50 align-top">
                    <td className="p-3 font-medium min-w-[180px]">{lead.company_name || "—"}</td>
                    <td className="p-3 text-slate-600 min-w-[150px]">
                      {isEditing ? (
                        <input value={draft.contact_person} onChange={(e) => setDraft((d) => ({ ...d, contact_person: e.target.value }))} className="w-full rounded border border-slate-200 px-2 py-1 text-xs" placeholder="Contact person" />
                      ) : lead.contact_person || <Missing />}
                    </td>
                    <td className="p-3 font-mono text-xs min-w-[140px]">
                      {isEditing ? (
                        <input value={draft.mobile} onChange={(e) => setDraft((d) => ({ ...d, mobile: e.target.value }))} className="w-full rounded border border-slate-200 px-2 py-1 text-xs" placeholder="10 digit mobile" />
                      ) : lead.clean_mobile || lead.mobile || <Missing />}
                    </td>
                    <td className="p-3 text-slate-600 min-w-[180px]">
                      {isEditing ? (
                        <input value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} className="w-full rounded border border-slate-200 px-2 py-1 text-xs" placeholder="Email" />
                      ) : lead.email || <Missing />}
                    </td>
                    <td className="p-3 text-xs font-bold text-blue-700">{lead.status || "—"}</td>
                    <td className="p-3 min-w-[140px]">
                      {isEditing ? (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => saveLead(lead.id)} disabled={savingId === lead.id} className="rounded bg-emerald-600 px-2 py-1 text-xs font-bold text-white disabled:opacity-50">{savingId === lead.id ? "Saving…" : "Save"}</button>
                          <button type="button" onClick={() => setEditingId(null)} className="rounded border border-slate-300 px-2 py-1 text-xs font-bold text-slate-600">Cancel</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => startEdit(lead)} className="rounded bg-blue-600 px-2 py-1 text-xs font-bold text-white">Edit</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          Next action: missing mobile/contact leads ko enrich karo, then Followups panel me Call / WhatsApp / Email buttons useful ho jayenge.
        </p>
      </div>
    </div>
  );
}

function QualityStat({ label, value, warn, good }: { label: string; value: number; warn?: boolean; good?: boolean }) {
  const valueClass = warn ? "text-red-700" : good ? "text-emerald-700" : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
      <p className="text-[11px] uppercase font-semibold text-slate-500">{label}</p>
      <p className={`text-xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

function Missing() {
  return <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Missing</span>;
}
