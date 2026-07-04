"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface TallyStatus {
  mode: "active" | "bypass" | "unconfigured";
  host: string | null;
  port: number | null;
  company: string | null;
  available: boolean;
  source?: "env" | "db" | "none";
  reason?: string;
}

type SyncResult = {
  ok?: boolean;
  synced: number;
  failed: number;
  demo?: boolean;
  message?: string;
  endpoint?: string | null;
  parsedCount?: number;
};

export default function TallyPage() {
  const [status, setStatus] = useState<TallyStatus | null>(null);
  const [liveTest, setLiveTest] = useState<{ success?: boolean; error?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/tally/status");
      const data = await res.json();
      setStatus(data.status);
      setLiveTest(data.liveTest ?? null);
    } catch (err) {
      console.error("Failed to load status:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/tally/sync", { method: "POST" });
      const data = await res.json();
      setSyncResult({
        ok: data.ok,
        synced: data.synced ?? data.recordsQueued ?? 0,
        failed: data.failed ?? 0,
        demo: data.demo,
        message: data.message,
        endpoint: data.endpoint,
        parsedCount: data.parsedCount,
      });
      loadStatus();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  const modeInfo = {
    active: { icon: CheckCircle, color: "text-emerald-400", label: "Active — Connected to Tally" },
    bypass: { icon: AlertCircle, color: "text-amber-400", label: "Bypass — Tally Unreachable" },
    unconfigured: { icon: XCircle, color: "text-red-400", label: "Unconfigured" },
  };

  if (loading || !status) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Tally</h1>
        <p className="text-slate-400">Loading status…</p>
      </div>
    );
  }

  const info = modeInfo[status.mode];
  const Icon = info.icon;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Tally Sync</h1>
        <Link href="/api/tally/test" target="_blank" className="text-sm text-cyan-400 hover:text-cyan-300">
          Open connection test JSON →
        </Link>
      </div>

      <div className="p-6 border border-slate-700 rounded-lg bg-slate-900/50">
        <div className="flex items-center gap-3 mb-4">
          <Icon className={`w-6 h-6 ${info.color}`} />
          <h2 className="text-xl font-semibold">{info.label}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><p className="text-xs text-slate-400 uppercase">Host</p><p className="text-lg font-mono">{status.host || "—"}</p></div>
          <div><p className="text-xs text-slate-400 uppercase">Port</p><p className="text-lg font-mono">{status.port || "—"}</p></div>
          <div><p className="text-xs text-slate-400 uppercase">Company</p><p className="text-lg">{status.company || "—"}</p></div>
          <div><p className="text-xs text-slate-400 uppercase">Config Source</p><p className="text-lg font-mono">{status.source || "—"}</p></div>
        </div>

        {status.reason && <p className="mt-4 text-sm text-amber-300">Reason: {status.reason}</p>}
        {liveTest && <p className="mt-4 text-sm text-slate-400">Live test: {liveTest.success ? "OK" : liveTest.error || "failed"}</p>}
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={loadStatus} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh Status
        </button>
        <button type="button" onClick={handleSync} disabled={syncing || status.mode !== "active"} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} /> {syncing ? "Syncing..." : "Sync to Sheet / Queue"}
        </button>
      </div>

      {syncResult && (
        <div className="p-4 border border-slate-700 rounded-lg bg-slate-900/50 space-y-2">
          <h3 className="font-semibold">Sync Result</h3>
          <div className="flex flex-wrap gap-4">
            <span className="text-emerald-400">Queued: {syncResult.synced}</span>
            <span className="text-cyan-400">Parsed: {syncResult.parsedCount ?? "—"}</span>
            <span className="text-red-400">Failed: {syncResult.failed}</span>
            <span className={syncResult.demo ? "text-amber-400" : "text-emerald-400"}>Source: {syncResult.demo ? "demo" : "live"}</span>
          </div>
          {syncResult.endpoint && <p className="text-xs text-slate-400 font-mono">Endpoint: {syncResult.endpoint}</p>}
          {syncResult.message && <p className="text-sm text-slate-300">{syncResult.message}</p>}
        </div>
      )}

      {status.mode !== "active" && (
        <div className="p-4 border border-amber-500/30 rounded-lg bg-amber-500/5 text-sm text-slate-300 space-y-2">
          <h3 className="font-semibold text-amber-400">Tally not connected?</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Enable the Tally XML gateway on port 9000.</li>
            <li>Use localhost only when FBOS and Tally run on the same machine.</li>
            <li>For cloud/server Tally, use the server IP or hostname.</li>
            <li>Restart the dev server after environment changes.</li>
            <li>Company name must match Tally exactly.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
