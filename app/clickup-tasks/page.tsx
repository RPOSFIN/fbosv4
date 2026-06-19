"use client";

import { useEffect, useState } from "react";
import type { ClickUpTaskRow, IntegrationSyncData } from "@/lib/integrations/sync-data";

export default function ClickUpTasksPage() {
  const [tasks, setTasks] = useState<ClickUpTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/integrations/clickup/sync");
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const data = await res.json();
        const syncData: IntegrationSyncData = data?.syncData ?? {};
        const resolvedTasks = syncData.tasks ?? syncData.clickupTasks ?? [];
        setTasks(resolvedTasks);
        setLastSyncAt(syncData.lastSyncAt ?? null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function formatSyncedAt(value: string | undefined | null): string {
    if (!value) return "—";
    try {
      return new Date(value as string).toLocaleString();
    } catch {
      return "—";
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">ClickUp Tasks</h1>
        <p className="text-slate-400">Loading tasks…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">ClickUp Tasks</h1>
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ClickUp Tasks</h1>
        <div className="text-sm text-slate-400">
          Total: {tasks.length}
          {lastSyncAt && (
            <span className="ml-4">
              Last sync: {formatSyncedAt(lastSyncAt)}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-700 rounded-lg">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">ID</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">External ID</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Space</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">List</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Synced At</th>
            </tr>
          </thead>
          <tbody className="bg-slate-950 divide-y divide-slate-800">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No tasks found. Run ClickUp sync to populate.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-900">
                  <td className="px-4 py-2 text-sm text-slate-200">{task.id}</td>
                  <td className="px-4 py-2 text-sm text-slate-300 font-mono">{task.external_id}</td>
                  <td className="px-4 py-2 text-sm text-slate-100">{task.name}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs">
                      {task.status || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-300">{task.space_name || "—"}</td>
                  <td className="px-4 py-2 text-sm text-slate-300">{task.list_name || "—"}</td>
                  <td className="px-4 py-2 text-sm text-slate-400">
                    {formatSyncedAt(task.synced_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}