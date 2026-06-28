"use client";

import { useEffect, useState } from "react";
import CommandHeader from "@/components/command-center/command-header";
import { pageShell, panelPad, subheading, muted, body } from "@/components/command-center/theme";
import EngineeringPanel from "@/components/engineering/engineering-panel";

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
  status: string;
  demo?: boolean;
}

function isReallyConnected(c: ConnectorStatus): boolean {
  if (c.status !== "connected") return false;
  if (c.name === "tally" && c.demo) return false;
  return true;
}

export default function IntegrationsPage() {
  const [syncData, setSyncData] = useState<IntegrationSyncData | null>(null);
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      const healthRes = await fetch("/api/integrations/health").catch(() => null);
      let loadedSync: IntegrationSyncData | null = null;

      if (healthRes?.ok) {
        const healthJson = await healthRes.json();
        const connectorMap = healthJson?.connectors ?? {};
        setConnectors(
          Object.entries(connectorMap).map(([name, info]: [string, any]) => ({
            name,
            label: info?.label ?? name,
            status: info?.status ?? "unknown",
            demo: info?.demo,
          }))
        );
        loadedSync = healthJson?.syncData ?? null;
      }

      setSyncData(loadedSync);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const clickupTasks: ClickUpTaskRow[] =
    syncData?.tables?.clickup_tasks ??
    syncData?.tasks ??
    syncData?.clickupTasks ??
    [];

  const clickupTaskCount: number =
    syncData?.clickupTaskCount ??
    (syncData?.tables?.clickup_tasks?.length ??
      syncData?.tasks?.length ??
      syncData?.clickupTasks?.length ??
      0);

  const financeRecordCount: number =
    syncData?.financeRecordCount ??
    (syncData?.tables?.finance_transactions?.length ?? 0);

  const financeRecords: FinanceRecord[] =
    syncData?.tables?.finance_transactions ?? [];

  const lastSyncAt: string | null = syncData?.lastSyncAt ?? null;
  const source: string = syncData?.source ?? "unknown";

  const formatDate = (value: string | null | undefined): string => {
    if (!value) return "—";
    try {
      return new Date(value as string).toLocaleString("en-IN");
    } catch {
      return "—";
    }
  };

  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined || Number.isNaN(value)) return "0";
    return value.toLocaleString("en-IN");
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <CommandHeader title="Integrations" />
        <div className={`${pageShell} space-y-5`}>
          {/* EngineeringOS stays visible even while integration data loads */}
          <section>
            <EngineeringPanel />
          </section>
          <p className={muted}>Loading integration status…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <CommandHeader title="Integrations" badge="USE TOP BAR TO SYNC" />
      <div className={`${pageShell} space-y-5`}>
        <p className={body}>
          Source: <span className="font-semibold text-slate-900">{source}</span>
          {lastSyncAt && (
            <span className="ml-4 text-slate-600">
              Last sync: {formatDate(lastSyncAt)}
            </span>
          )}
        </p>

        {error && (
          <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-red-800 text-[15px]">
            Error: {error}
          </div>
        )}

        {/* EngineeringOS — developer tool, collapsible (not a permanent business module) */}
        <section>
          <EngineeringPanel />
        </section>

        <section>
          <h2 className={subheading}>Connectors</h2>
          {connectors.length === 0 ? (
            <div className={`${panelPad} mt-3 text-slate-500`}>No connectors registered.</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              {connectors.map((c) => {
                const ok = isReallyConnected(c);
                return (
                  <div
                    key={c.name}
                    className={`${panelPad} ${ok ? "border-emerald-300 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-900 text-[15px]">{c.label}</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                        }`}
                      >
                        {ok ? "Connected" : "Fail"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{c.name}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className={subheading}>Sync Stats</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <StatCard label="ClickUp Tasks" value={formatNumber(clickupTaskCount)} highlight={clickupTaskCount > 0} />
            <StatCard label="Finance Records" value={formatNumber(financeRecordCount)} highlight={financeRecordCount > 0} />
            <StatCard
              label="Tables Available"
              value={String(syncData?.tables ? Object.keys(syncData.tables).length : 0)}
            />
            <StatCard label="Source" value={source} />
          </div>
        </section>

        <section>
          <h2 className={subheading}>ClickUp Tasks ({formatNumber(clickupTasks.length)})</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-[15px]">
              <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">External ID</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Space</th>
                  <th className="px-4 py-3 text-left">List</th>
                  <th className="px-4 py-3 text-left">Synced At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clickupTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      No ClickUp tasks synced yet.
                    </td>
                  </tr>
                ) : (
                  clickupTasks.slice(0, 50).map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-sm text-slate-700">{task.external_id ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-900">{task.name ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">{task.status ?? "—"}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{task.space_name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-600">{task.list_name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-sm">{formatDate(task.synced_at ?? null)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className={subheading}>Finance Records ({formatNumber(financeRecords.length)})</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-[15px]">
              <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Voucher</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Company</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Sync Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {financeRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      No finance records synced yet.
                    </td>
                  </tr>
                ) : (
                  financeRecords.slice(0, 50).map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-sm">{rec.voucher_no ?? "—"}</td>
                      <td className="px-4 py-2.5">{rec.voucher_type ?? "—"}</td>
                      <td className="px-4 py-2.5">{rec.company ?? "—"}</td>
                      <td className="px-4 py-2.5 font-semibold">{formatNumber(rec.amount)}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            rec.sync_status === "synced"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
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
    </div>
  );
}

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
      className={`${panelPad} ${highlight ? "border-emerald-300 bg-emerald-50/60" : ""}`}
    >
      <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? "text-emerald-800" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
