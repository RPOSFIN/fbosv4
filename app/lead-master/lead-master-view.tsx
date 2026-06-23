"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { hasPermission } from "@/lib/rbac/permissions";
import { useAuth } from "@/hooks/use-auth";
import type { FbosRole } from "@/lib/rbac/permissions";
import { pushLeadToGoogle } from "@/lib/google-write";

type Lead = {
  id: string;
  company_name: string;
  contact_person?: string;
  mobile?: string;
  email?: string;
  status?: string;
  source?: string;
  created_at?: string;
};

type LeadsResponse = {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type LeadStats = {
  total: number;
  unique: number;
  duplicates: number;
  won?: number;
  lost?: number;
  active?: number;
  statusBreakdown: Record<string, number>;
  topSources: Array<{ name: string; count: number }>;
  recentLeads: Array<{
    id: string;
    company_name: string;
    status: string;
    source: string;
    created_at: string;
  }>;
};

function unwrapLeadsPage(payload: unknown): LeadsResponse {
  if (Array.isArray(payload)) {
    return {
      leads: payload as Lead[],
      total: payload.length,
      page: 1,
      limit: payload.length,
      totalPages: 1,
    };
  }
  if (payload && typeof payload === "object") {
    const obj = payload as LeadsResponse & { data?: LeadsResponse };
    const inner = obj.data ?? obj;
    const leads = inner.leads ?? [];
    return {
      leads,
      total: inner.total ?? leads.length,
      page: inner.page ?? 1,
      limit: inner.limit ?? leads.length,
      totalPages: inner.totalPages ?? 1,
    };
  }
  return { leads: [], total: 0, page: 1, limit: 25, totalPages: 0 };
}

function unwrapStats(payload: unknown): LeadStats | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as LeadStats & { data?: LeadStats };
  return obj.data ?? obj;
}

type ClickUpTask = {
  id: string;
  external_id?: string;
  name: string;
  status: string | null;
  list_name?: string | null;
  synced_at?: string;
};

type PendingFollowup = {
  id: string;
  next_followup?: string | null;
  status?: string | null;
  notes?: string | null;
};

const STATUS_OPTIONS = ["", "NEW", "CONTACTED", "PROPOSAL", "WON", "LOST"];

export default function LeadMasterView() {
  const { session } = useAuth();
  const role = session?.profile.role as FbosRole | undefined;
  const canDelete = role ? hasPermission(role, "leads", "delete") : false;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const leadsTableRef = useRef<HTMLDivElement>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    () => searchParams.get("status")?.trim() || ""
  );
  const [sourceFilter, setSourceFilter] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [clickupTasks, setClickupTasks] = useState<ClickUpTask[]>([]);
  const [syncCounts, setSyncCounts] = useState<{
    gsheet?: { inserted: number; updated: number; skipped: number; syncedAt?: string };
    clickup?: { inserted: number; updated: number; skipped: number; syncedAt?: string };
  }>({});
  const [loading, setLoading] = useState(true);
  const [deduping, setDeduping] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [pendingFollowups, setPendingFollowups] = useState<PendingFollowup[]>([]);

  const limit = 25;

  const applyStatusFilter = useCallback(
    (status: string, scrollToTable = true) => {
      setPage(1);
      setStatusFilter(status);
      const params = new URLSearchParams(searchParams.toString());
      if (status) {
        params.set("status", status);
      } else {
        params.delete("status");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      if (scrollToTable) {
        requestAnimationFrame(() => {
          leadsTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const urlStatus = searchParams.get("status")?.trim() || "";
    setStatusFilter(urlStatus);
    setPage(1);
  }, [searchParams]);

  const loadStats = useCallback(async () => {
    try {
      const statsResponse = await apiFetch<LeadStats>("/api/leads/stats");
      console.log("RAW STATS", statsResponse);
      setStats(unwrapStats(statsResponse));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (sourceFilter) params.set("source", sourceFilter);

      const response = await apiFetch<LeadsResponse | Lead[]>(`/api/leads?${params}`);
      console.log("RAW RESPONSE", response);
      const data = unwrapLeadsPage(response);
      setLeads(data.leads);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setActionMsg(null);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sourceFilter]);

  const loadClickUp = useCallback(async () => {
    try {
      const res = await apiFetch<{
        syncData: { clickupTasks: ClickUpTask[]; clickupTaskCount: number };
        connectors: Array<{
          connector_name: string;
          last_sync_at?: string | null;
          config?: Record<string, unknown>;
        }>;
      }>("/api/integrations");
      setClickupTasks(res.syncData.clickupTasks.slice(0, 6));

      const pickCounts = (name: string) => {
        const c = res.connectors?.find((x) => x.connector_name === name);
        if (!c) return undefined;
        const cfg = c.config || {};
        const counts = {
          inserted: Number(cfg.leadsImported ?? cfg.inserted ?? 0),
          updated: Number(cfg.leadsUpdated ?? cfg.updated ?? 0),
          skipped: Number(cfg.leadsSkipped ?? cfg.skipped ?? 0),
          syncedAt: c.last_sync_at || undefined,
        };
        if (!counts.syncedAt && !counts.inserted && !counts.updated && !counts.skipped) {
          return undefined;
        }
        return counts;
      };
      setSyncCounts({
        gsheet: pickCounts("gsheet"),
        clickup: pickCounts("clickup"),
      });
    } catch {
      setClickupTasks([]);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadClickUp();
  }, [loadStats, loadClickUp]);

  useEffect(() => {
    const t = setTimeout(() => loadLeads(), 200);
    return () => clearTimeout(t);
  }, [loadLeads]);

  useEffect(() => {
    if (!selected?.id) {
      setPendingFollowups([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        const rows = await apiFetch<PendingFollowup[]>(
          `/api/followups?lead_id=${selected.id}`
        );
        if (active) setPendingFollowups(rows);
      } catch {
        if (active) setPendingFollowups([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [selected?.id]);

  const sourceOptions = useMemo(() => {
    if (!stats?.topSources) return [];
    return stats.topSources.map((s) => s.name);
  }, [stats]);

  const statusOptions = useMemo(() => {
    const fromStats = stats ? Object.keys(stats.statusBreakdown) : [];
    const merged = new Set([...STATUS_OPTIONS.filter(Boolean), ...fromStats]);
    return Array.from(merged).sort((a, b) => a.localeCompare(b));
  }, [stats]);

  async function deleteLead(id: string) {
    if (!confirm("Delete this lead?")) return;
    await apiFetch(`/api/leads/${id}`, { method: "DELETE" });
    if (selected?.id === id) setSelected(null);
    await Promise.all([loadLeads(), loadStats()]);
  }

  async function syncLeadToGoogle(lead: Lead) {
    await pushLeadToGoogle(lead);
    setActionMsg(`Synced "${lead.company_name}" to Google Sheets`);
  }

  async function runDedupe() {
    if (!confirm("Remove duplicate leads (keeps oldest per company+mobile)?")) return;
    setDeduping(true);
    try {
      const result = await apiFetch<{ message: string; totalBefore: number; totalAfter: number }>(
        "/api/leads/dedupe",
        { method: "POST" }
      );
      setActionMsg(result.message);
      setPage(1);
      await Promise.all([loadLeads(), loadStats()]);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Dedupe failed");
    } finally {
      setDeduping(false);
    }
  }

  const aiSummary = useMemo(() => {
    if (!stats) return null;
    const topSource = stats.topSources[0];
    const topStatus = Object.entries(stats.statusBreakdown).sort((a, b) => b[1] - a[1])[0];
    const lines = [
      `${stats.unique.toLocaleString()} unique leads in CRM${stats.duplicates > 0 ? ` (${stats.duplicates.toLocaleString()} duplicates detected)` : ""}.`,
      topSource
        ? `Top source: ${topSource.name} (${topSource.count.toLocaleString()} leads).`
        : "No source data yet — sync Google Sheets or ClickUp.",
      topStatus
        ? `Most common status: ${topStatus[0]} (${topStatus[1].toLocaleString()}).`
        : "",
      stats.recentLeads.length
        ? `Latest: ${stats.recentLeads.slice(0, 3).map((l) => l.company_name).join(", ")}.`
        : "",
    ].filter(Boolean);
    return lines.join(" ");
  }, [stats]);

  return (
    <div className="p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Lead Master</h1>
          <p className="mt-2 text-slate-400">
            CRM hub — Google Sheets, ClickUp, and manual leads
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/sales-workbench" className="text-cyan-400 hover:text-cyan-300">
            ← Sales Workbench
          </Link>
          <Link href="/integrations" className="text-slate-400 hover:text-slate-300">
            Integration Hub
          </Link>
          <Link href="/clickup-tasks" className="text-slate-400 hover:text-slate-300">
            ClickUp Tasks
          </Link>
        </div>
      </div>

      {actionMsg && (
        <p className="mb-4 text-sm border border-cyan-800/50 bg-cyan-950/20 text-cyan-200 rounded-lg px-4 py-2">
          {actionMsg}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total in DB" value={stats?.total ?? "—"} />
        <KpiCard label="Unique Leads" value={stats?.unique ?? "—"} tone="green" />
        <KpiCard
          label="Duplicates"
          value={stats?.duplicates ?? "—"}
          tone={stats && stats.duplicates > 0 ? "amber" : undefined}
        />
        <KpiCard label="This Page" value={leads.length} sub={`of ${total.toLocaleString()}`} />
      </div>

      {(syncCounts.gsheet || syncCounts.clickup) && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {syncCounts.gsheet && (
            <SyncCountCard
              title="Google Sheets — last sync"
              counts={syncCounts.gsheet}
              href="/integrations"
            />
          )}
          {syncCounts.clickup && (
            <SyncCountCard
              title="ClickUp — last sync"
              counts={syncCounts.clickup}
              href="/integrations"
            />
          )}
        </div>
      )}

      {stats && stats.duplicates > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-800/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
          <span>
            {stats.duplicates.toLocaleString()} duplicate rows detected (likely from repeated GSheet syncs).
          </span>
          <button
            onClick={runDedupe}
            disabled={deduping}
            className="rounded-lg bg-amber-700 px-4 py-1.5 text-xs hover:bg-amber-600 disabled:opacity-50"
          >
            {deduping ? "Deduplicating…" : "Deduplicate Now"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <section className="lg:col-span-2 border border-slate-800 rounded-xl p-5 bg-slate-900/40">
          <h2 className="text-lg font-semibold mb-3">AI Lead Report</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {aiSummary || "Loading lead intelligence…"}
          </p>
          {stats && (
            <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-slate-500 uppercase tracking-wide">Status Breakdown</p>
                  {statusFilter && (
                    <button
                      type="button"
                      onClick={() => applyStatusFilter("")}
                      className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {Object.entries(stats.statusBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([st, n]) => {
                      const isActive = statusFilter === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => applyStatusFilter(st)}
                          className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors ${
                            isActive
                              ? "border border-cyan-700/50 bg-cyan-950/50 text-cyan-200"
                              : "border border-transparent text-slate-300 hover:bg-slate-800/60 hover:text-slate-100"
                          }`}
                        >
                          <span className="truncate pr-2">{st}</span>
                          <span
                            className={`shrink-0 tabular-nums ${isActive ? "text-cyan-400" : "text-slate-500"}`}
                          >
                            {n.toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
              <div>
                <p className="text-slate-500 mb-2 uppercase tracking-wide">Top Sources</p>
                <div className="space-y-1">
                  {stats.topSources.map((s) => (
                    <div key={s.name} className="flex justify-between text-slate-300">
                      <span>{s.name}</span>
                      <span className="text-slate-500">{s.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="border border-slate-800 rounded-xl p-5 bg-slate-900/40">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">ClickUp Leads</h2>
            <Link href="/clickup-tasks" className="text-xs text-cyan-400 hover:underline">
              View all →
            </Link>
          </div>
          {clickupTasks.length === 0 ? (
            <p className="text-xs text-slate-500">
              No ClickUp tasks synced.{" "}
              <Link href="/integrations" className="text-cyan-400 hover:underline">
                Sync ClickUp
              </Link>{" "}
              to map tasks → leads.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {clickupTasks.map((t) => (
                <li
                  key={t.id}
                  className="border-b border-slate-800/60 pb-2 last:border-0 cursor-pointer hover:text-cyan-300"
                  onClick={() =>
                    setSelected({
                      id: t.id,
                      company_name: t.name,
                      status: t.status || "NEW",
                      source: "ClickUp",
                    })
                  }
                >
                  <div className="font-medium text-slate-200">{t.name}</div>
                  <div className="text-xs text-slate-500">
                    {t.status || "—"}
                    {t.list_name ? ` · ${t.list_name}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div ref={leadsTableRef} id="leads-table" className="scroll-mt-6">
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            className="flex-1 min-w-[200px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="Search company, contact, mobile…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          <select
            className={`rounded-lg border bg-slate-900 px-3 py-2 text-sm ${
              statusFilter ? "border-cyan-700/50 text-cyan-200" : "border-slate-700"
            }`}
            value={statusFilter}
            onChange={(e) => applyStatusFilter(e.target.value, false)}
          >
            <option value="">All Statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {statusFilter && (
            <button
              type="button"
              onClick={() => applyStatusFilter("")}
              className="rounded-lg border border-cyan-700/50 bg-cyan-950/30 px-3 py-2 text-sm text-cyan-300 hover:bg-cyan-950/50"
            >
              Clear: {statusFilter} ×
            </button>
          )}
          <select
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            value={sourceFilter}
            onChange={(e) => {
              setPage(1);
              setSourceFilter(e.target.value);
            }}
          >
            <option value="">All Sources</option>
            {sourceOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 text-sm text-slate-400 flex justify-between">
              <span>
                {loading ? "Loading…" : `${total.toLocaleString()} lead(s)`}
              </span>
              <span>
                Page {page} / {totalPages || 1}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-800">
                    <th className="px-4 py-2">Client Name</th>
                    <th className="px-4 py-2">Contact</th>
                    <th className="px-4 py-2">Mobile</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => setSelected(lead)}
                      className={`border-b border-slate-800/60 cursor-pointer hover:bg-slate-800/40 ${
                        selected?.id === lead.id ? "bg-cyan-950/30" : ""
                      }`}
                    >
                      <td className="px-4 py-2 text-slate-200">{lead.company_name}</td>
                      <td className="px-4 py-2 text-slate-400">{lead.contact_person || "—"}</td>
                      <td className="px-4 py-2 text-slate-400">{lead.mobile || "—"}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={lead.status || "NEW"} />
                      </td>
                      <td className="px-4 py-2 text-slate-500 text-xs">{lead.source || "—"}</td>
                    </tr>
                  ))}
                  {!loading && leads.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No leads match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-sm">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-700 px-3 py-1 disabled:opacity-40 hover:bg-slate-800"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-700 px-3 py-1 disabled:opacity-40 hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>

          <div className="border border-slate-800 rounded-xl p-5 bg-slate-900/40 h-fit sticky top-4">
            <h2 className="text-lg font-semibold mb-4">Lead Details</h2>
            {!selected ? (
              <p className="text-sm text-slate-500">Select a lead from the table to view details.</p>
            ) : (
              <div className="space-y-3 text-sm">
                <DetailRow label="Client Name" value={selected.company_name} />
                <DetailRow label="Contact" value={selected.contact_person} />
                <DetailRow label="Mobile" value={selected.mobile} />
                <DetailRow label="Email" value={selected.email} />
                <DetailRow label="Status" value={selected.status || "NEW"} />
                <DetailRow label="Source" value={selected.source} />
                {selected.created_at && (
                  <DetailRow
                    label="Created"
                    value={new Date(selected.created_at).toLocaleString()}
                  />
                )}
                {pendingFollowups.length > 0 && (
                  <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 px-3 py-2">
                    <p className="text-xs text-amber-300 font-medium">
                      Pending followup ({pendingFollowups.length})
                    </p>
                    {pendingFollowups.slice(0, 2).map((f) => (
                      <p key={f.id} className="text-xs text-amber-200/80 mt-1">
                        Due: {f.next_followup || "No date"} · {f.status || "Pending"}
                      </p>
                    ))}
                    <Link
                      href="/followups/today"
                      className="inline-block mt-2 text-xs text-cyan-400 hover:underline"
                    >
                      View in Today&apos;s Followup →
                    </Link>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => syncLeadToGoogle(selected)}
                    className="rounded-lg bg-green-700 px-3 py-1.5 text-xs hover:bg-green-600"
                  >
                    Google Sync
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => deleteLead(selected.id)}
                      className="rounded-lg bg-red-800 px-3 py-1.5 text-xs hover:bg-red-700"
                    >
                      Delete
                    </button>
                  )}
                  <Link
                    href="/sales-kanban"
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs hover:bg-slate-800"
                  >
                    Kanban →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SyncCountCard({
  title,
  counts,
  href,
}: {
  title: string;
  counts: { inserted: number; updated: number; skipped: number; syncedAt?: string };
  href: string;
}) {
  const parts: string[] = [];
  if (counts.inserted) parts.push(`${counts.inserted} inserted`);
  if (counts.updated) parts.push(`${counts.updated} updated`);
  if (counts.skipped) parts.push(`${counts.skipped} skipped`);
  const summary = parts.length ? parts.join(" · ") : "No sync yet";

  return (
    <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/40 text-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs text-slate-500 uppercase tracking-wide">{title}</p>
        <Link href={href} className="text-xs text-cyan-400 hover:underline">
          Sync →
        </Link>
      </div>
      <p className="text-slate-200">{summary}</p>
      {counts.syncedAt && (
        <p className="text-xs text-slate-500 mt-1">
          {new Date(counts.syncedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "green" | "amber";
}) {
  const color =
    tone === "green"
      ? "text-green-400"
      : tone === "amber"
        ? "text-amber-400"
        : "text-white";
  return (
    <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/40">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-slate-200">{value || "—"}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const styles: Record<string, string> = {
    NEW: "border-blue-500/40 text-blue-300",
    CONTACTED: "border-cyan-500/40 text-cyan-300",
    PROPOSAL: "border-purple-500/40 text-purple-300",
    WON: "border-green-500/40 text-green-300",
    LOST: "border-red-500/40 text-red-300",
    BACKLOG: "border-amber-500/40 text-amber-300",
    "NOT INTERESTED/REQUIRED": "border-red-500/40 text-red-300",
    "BACK CALL": "border-yellow-500/40 text-yellow-300",
    "NOT CONNECTED": "border-orange-500/40 text-orange-300",
    PLANNING: "border-indigo-500/40 text-indigo-300",
    "CONNECT IN FUTURE": "border-teal-500/40 text-teal-300",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs ${styles[s] || "border-slate-600 text-slate-400"}`}
    >
      {s}
    </span>
  );
}
