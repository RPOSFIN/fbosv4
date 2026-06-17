"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import type { ClickUpTaskRow, IntegrationSyncData } from "@/lib/integrations/sync-data";
import type { IntegrationRecord } from "@/lib/integrations/types";

type PreviewTask = { id: string; name: string; status?: string };

type TasksResponse = {
  syncData: IntegrationSyncData;
  connectors: IntegrationRecord[];
};

export default function ClickUpTasksPage() {
  const [rows, setRows] = useState<ClickUpTaskRow[]>([]);
  const [count, setCount] = useState(0);
  const [fromPreview, setFromPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<TasksResponse>("/api/integrations");
      const clickup = res.connectors.find((c) => c.connector_name === "clickup");
      const preview = Array.isArray(clickup?.config.tasksPreview)
        ? (clickup.config.tasksPreview as PreviewTask[])
        : [];

      if (res.syncData.clickupTaskCount > 0) {
        setRows(res.syncData.clickupTasks);
        setCount(res.syncData.clickupTaskCount);
        setFromPreview(false);
      } else if (preview.length) {
        setRows(
          preview.map((t) => ({
            id: t.id,
            external_id: t.id,
            name: t.name,
            status: t.status || null,
            list_name: null,
            space_name: null,
            synced_at: clickup?.last_sync_at || new Date().toISOString(),
          }))
        );
        setCount(preview.length);
        setFromPreview(true);
      } else {
        setRows([]);
        setCount(0);
        setFromPreview(false);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">ClickUp Tasks</h1>
          <p className="mt-2 text-slate-400">
            Synced tasks from ClickUp — mapped to{" "}
            <Link href="/lead-master" className="text-cyan-400 hover:underline">
              Lead Master
            </Link>{" "}
            /{" "}
            <Link href="/leads" className="text-cyan-400 hover:underline">
              Leads
            </Link>
          </p>
        </div>
        <Link href="/integrations" className="text-sm text-cyan-400 hover:text-cyan-300">
          ← Integration Hub
        </Link>
      </div>

      {fromPreview && (
        <p className="mb-4 text-xs text-amber-300 border border-amber-800/40 bg-amber-950/20 rounded-lg px-4 py-2">
          Showing live preview from last sync — run{" "}
          <code>npm run db:integrations</code> and apply migration 004 in Supabase SQL Editor to persist tasks in{" "}
          <code>clickup_tasks</code> table.
        </p>
      )}

      {error && (
        <p className="mb-4 text-sm text-red-300 border border-red-800/50 bg-red-950/20 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-slate-500 animate-pulse">Loading tasks…</p>
      ) : count === 0 ? (
        <div className="border border-slate-800 rounded-xl p-6 bg-slate-900/40 text-slate-400">
          <p>No ClickUp tasks synced yet.</p>
          <p className="mt-2 text-sm">
            Go to{" "}
            <Link href="/integrations" className="text-cyan-400 hover:underline">
              Integration Hub
            </Link>{" "}
            and click <strong>Sync ClickUp</strong>.
          </p>
        </div>
      ) : (
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 text-sm text-slate-400">
            {count} task(s) {fromPreview ? "(preview)" : "in database"}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-800">
                <th className="px-4 py-2">Task</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">List</th>
                <th className="px-4 py-2">Space</th>
                <th className="px-4 py-2">Synced</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((task) => (
                <tr key={task.id} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                  <td className="px-4 py-2 text-slate-200">
                    <Link href="/lead-master" className="hover:text-cyan-300">
                      {task.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-400">{task.status || "—"}</td>
                  <td className="px-4 py-2 text-slate-400">{task.list_name || "—"}</td>
                  <td className="px-4 py-2 text-slate-400">{task.space_name || "—"}</td>
                  <td className="px-4 py-2 text-slate-500 text-xs">
                    {new Date(task.synced_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
