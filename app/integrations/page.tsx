"use client";

import { useEffect, useState } from "react";

// Local type definitions (null-safe)
interface ClickUpTaskRow {
  id: string;
  external_id: string;
  name: string;
  status: string | null;
  list_name: string | null;
  space_name: string | null;
  synced_at: string | null;
}

interface FinanceRecord {
  id: string;
  company: string | null;
  voucher_no: string | null;
  voucher_type: string | null;
  amount: number;
  sync_status: string;
  created_at: string | null;
}

interface IntegrationTables {
  clickup_tasks?: ClickUpTaskRow[];
  finance_transactions?: FinanceRecord[];
}

interface IntegrationSyncData {
  tasks?: ClickUpTaskRow[];
  clickupTasks?: ClickUpTaskRow[];
  clickupTaskCount?: number;
  financeRecordCount?: number;
  lastSyncAt?: string;
  source?: string;
  tables?: IntegrationTables;
}

interface ConnectorStatus {
  name: string;
  label: string;
  status: "connected" | "pending" | "error" | "bypass" | "unknown";
}

export default function IntegrationsPage() {
  const [syncData, setSyncData] = useState<IntegrationSyncData | null>(null);
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [syncRes, healthRes] = await Promise.all([
          fetch("/api/integrations/clickup/sync").catch(() => null),
          fetch("/api/integrations/health").catch(() => null),
        ]);

        if (syncRes?.ok) {
          const syncJson = await syncRes.json();
          setSyncData(syncJson?.syncData ?? null);
        }

        if (healthRes?.ok) {
          const healthJson = await healthRes.json();
          const connectorMap = healthJson?.connectors ?? {};
          setConnectors(
            Object.entries(connectorMap).map(([name, info]: [string, any]) => ({
              name,
              label: info?.label ?? name,
              status: info?.status ?? "unknown",
            }))
          );
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // --- Null-safe derived values ---
  const clickupTasks: ClickUpTaskRow[] =
    syncData?.tables?.clickup_tasks ??
    syncData?.tasks ??
    syncData?.clickupTasks ??
    [];

  const financeRecords: FinanceRecord[] =
    syncData?.tables?.finance_transactions ?? [];

  const clickupTaskCount: number =
    syncData?.clickupTaskCount ??
    (syncData?.tables?.clickup_tasks?.length ??
      syncData?.tasks?.length ??
      syncData?.clickupTasks?.length ??
      0);

  const financeRecordCount: number =
    syncData?.financeRecordCount ??
    (syncData?.tables?.finance_transactions?.length ?? 0);

  const lastSyncAt: string | null = syncData?.lastSyncAt ?? null;
  const source: string = syncData?.source ?? "unknown";

  // --- Safe formatters ---
  const formatDate = (value: string | null | undefined): string => {
    if (!value) return "—";
    try {
      return new Date(value as string).toLocaleString();
    } catch {
      return "—";
    }
  };

  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined || Number.isNaN(value)) return "0";
    return value.toLocaleString();
  };

  const statusColor = (status: string): string => {
    switch (status) {
      case "connected":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "pending":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "bypass":
        return "bg-slate-500/20 text-slate-300 border-slate-500/40";
      case "error":
        return "bg-red-500/20 text-red-300 border-red-500/40";
      default:
        return "bg-slate-700/40 text-slate-400 border-slate-600";
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Integrations</h1>
        <p className="text-slate-400">Loading integration status…</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-sm text-slate-400 mt-1">
            Source: <span className="text-slate-200">{source}</span>
            {lastSyncAt && (
              <span className="ml-4">
                Last sync: <span className="text-slate-200">{formatDate(lastSyncAt)}</span>
              </span>
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300">
          Error: {error}
        </div>
      )}

      {/* Connector Cards */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Connectors</h2>
        {connectors.length === 0 ? (
          <div className="p-4 border border-slate-700 rounded-lg bg-slate-900/50 text-slate-400">
            No connectors registered.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {connectors.map((c) => (
              <div
                key={c.name}
                className="p-4 border border-slate-700 rounded-lg bg-slate-900/50"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-100">{c.label}</h3>
                  <span
                    className={`px-2 py-1 rounded text-xs border ${statusColor(c.status)}`}
                  >
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{c.name}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Stats */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Sync Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="ClickUp Tasks"
            value={formatNumber(clickupTaskCount)}
            highlight={(clickupTaskCount ?? 0) > 0}
          />
          <StatCard
            label="Finance Records"
            value={formatNumber(financeRecordCount)}
            highlight={(financeRecordCount ?? 0) > 0}
          />
          <StatCard
            label="Tables Available"
            value={String(
              (syncData?.tables ? Object.keys(syncData.tables).length : 0)
            )}
          />
          <StatCard label="Source" value={source} />
        </div>
      </section>

      {/* ClickUp Tasks Table */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          ClickUp Tasks ({formatNumber(clickupTasks.length)})
        </h2>
        <div className="overflow-x-auto border border-slate-700 rounded-lg">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">External ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Space</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">List</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Synced At</th>
              </tr>
            </thead>
            <tbody className="bg-slate-950 divide-y divide-slate-800">
              {clickupTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No ClickUp tasks synced yet.
                  </td>
                </tr>
              ) : (
                clickupTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-900">
                    <td className="px-4 py-2 text-sm text-slate-300 font-mono">
                      {task.external_id ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-100">
                      {task.name ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs">
                        {task.status ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-300">
                      {task.space_name ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-300">
                      {task.list_name ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-400">
                      {formatDate(task.synced_at ?? null)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Finance Records Table */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Finance Records ({formatNumber(financeRecords.length)})
        </h2>
        <div className="overflow-x-auto border border-slate-700 rounded-lg">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Voucher</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Company</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Amount</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Sync Status</th>
              </tr>
            </thead>
            <tbody className="bg-slate-950 divide-y divide-slate-800">
              {financeRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No finance records synced yet.
                  </td>
                </tr>
              ) : (
                financeRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-900">
                    <td className="px-4 py-2 text-sm text-slate-300 font-mono">
                      {rec.voucher_no ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-300">
                      {rec.voucher_type ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-300">
                      {rec.company ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-100">
                      {formatNumber(rec.amount)}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs border ${statusColor(
                          rec.sync_status === "synced"
                            ? "connected"
                            : rec.sync_status === "pending_tally"
                            ? "pending"
                            : rec.sync_status === "tally_error"
                            ? "error"
                            : "bypass"
                        )}`}
                      >
                        {rec.sync_status ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// --- Small helper component ---
function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 border rounded-lg ${
        highlight
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-slate-700 bg-slate-900/50"
      }`}
    >
      <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? "text-emerald-300" : "text-slate-100"}`}>
        {value}
      </p>
    </div>
  );
}