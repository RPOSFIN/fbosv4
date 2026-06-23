"use client";

import { useCallback, useEffect, useState } from "react";

type ConnectorKey = "gsheet" | "tally" | "clickup" | "supabase";

type ConnectorState = {
  key: ConnectorKey;
  label: string;
  connected: boolean;
  syncing: boolean;
};

const SYNC_ENDPOINTS: Record<ConnectorKey, string | null> = {
  gsheet: "/api/integrations/gsheet/sync",
  tally: "/api/integrations/tally/sync",
  clickup: "/api/integrations/clickup/sync",
  supabase: null,
};

export default function SyncToolbar({ compact }: { compact?: boolean }) {
  const [items, setItems] = useState<ConnectorState[]>([
    { key: "gsheet", label: "GSheet", connected: false, syncing: false },
    { key: "tally", label: "Tally", connected: false, syncing: false },
    { key: "clickup", label: "ClickUp", connected: false, syncing: false },
    { key: "supabase", label: "Supabase", connected: false, syncing: false },
  ]);
  const [syncAllBusy, setSyncAllBusy] = useState(false);

  const refresh = useCallback(() => {
    fetch("/api/integrations/health")
      .then((r) => r.json())
      .then((json) => {
        const c = json?.connectors ?? {};
        const supaOk = c.supabase?.status === "connected";
        setItems([
          {
            key: "gsheet",
            label: "GSheet",
            connected: c.gsheet?.status === "connected",
            syncing: false,
          },
          {
            key: "tally",
            label: "Tally",
            connected: c.tally?.status === "connected" && !c.tally?.demo,
            syncing: false,
          },
          {
            key: "clickup",
            label: "ClickUp",
            connected: c.clickup?.status === "connected",
            syncing: false,
          },
          {
            key: "supabase",
            label: "Supabase",
            connected: supaOk,
            syncing: false,
          },
        ]);
      })
      .catch(() => {
        setItems((prev) => prev.map((p) => ({ ...p, connected: false, syncing: false })));
      });
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 45000);
    return () => clearInterval(t);
  }, [refresh]);

  async function syncOne(key: ConnectorKey) {
    const endpoint = SYNC_ENDPOINTS[key];
    if (!endpoint) {
      refresh();
      return;
    }
    setItems((prev) => prev.map((p) => (p.key === key ? { ...p, syncing: true } : p)));
    try {
      await fetch(endpoint, { method: "POST" });
    } catch {
      /* status refresh handles display */
    } finally {
      setItems((prev) => prev.map((p) => (p.key === key ? { ...p, syncing: false } : p)));
      refresh();
    }
  }

  async function syncAll() {
    setSyncAllBusy(true);
    try {
      await fetch("/api/integrations/sync-all", { method: "POST" });
    } catch {
      /* ignore */
    } finally {
      setSyncAllBusy(false);
      refresh();
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "justify-end"}`}>
      {items.map((c) => (
        <button
          key={c.key}
          type="button"
          disabled={c.syncing || syncAllBusy || c.key === "supabase"}
          onClick={() => syncOne(c.key)}
          title={c.key === "supabase" ? "Supabase status (auto)" : `Sync ${c.label}`}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
            c.connected
              ? "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
              : "border-red-300 bg-red-50 text-red-900 hover:bg-red-100"
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                c.connected ? "bg-emerald-400 animate-ping" : "hidden"
              }`}
            />
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                c.connected ? "bg-emerald-500" : "bg-red-500"
              } ${c.syncing ? "animate-pulse" : ""}`}
            />
          </span>
          <span className="font-semibold">{c.label}</span>
          <span className="text-xs opacity-80">{c.connected ? "Connected" : "Fail"}</span>
          {c.syncing && <span className="text-xs">…</span>}
        </button>
      ))}
      <button
        type="button"
        onClick={syncAll}
        disabled={syncAllBusy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm font-semibold disabled:opacity-50 shadow-sm"
      >
        {syncAllBusy ? "Syncing All…" : "↻ Sync All"}
      </button>
    </div>
  );
}
