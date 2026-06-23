"use client";

import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface TallyStatus {
  mode: 'active' | 'bypass' | 'unconfigured';
  host: string | null;
  port: number | null;
  company: string | null;
  available: boolean;
}

export default function TallyPage() {
  const [status, setStatus] = useState<TallyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number } | null>(null);

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/tally/status');
      const data = await res.json();
      setStatus(data.status);
    } catch (err) {
      console.error('Failed to load status:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/tally/sync', { method: 'POST' });
      const data = await res.json();
      setSyncResult({ synced: data.synced, failed: data.failed });
      loadStatus();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  const modeInfo = {
    active: { icon: CheckCircle, color: 'text-emerald-400', label: 'Active — Connected to Tally' },
    bypass: { icon: AlertCircle, color: 'text-amber-400', label: 'Bypass — Tally Unreachable' },
    unconfigured: { icon: XCircle, color: 'text-red-400', label: 'Unconfigured' },
  };

  if (loading || !status) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Tally Integration</h1>
        <p className="text-slate-400">Loading status…</p>
      </div>
    );
  }

  const info = modeInfo[status.mode];
  const Icon = info.icon;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Tally Integration</h1>

      {/* Status Card */}
      <div className="p-6 border border-slate-700 rounded-lg bg-slate-900/50">
        <div className="flex items-center gap-3 mb-4">
          <Icon className={`w-6 h-6 ${info.color}`} />
          <h2 className="text-xl font-semibold">{info.label}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-400 uppercase">Host</p>
            <p className="text-lg font-mono">{status.host || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase">Port</p>
            <p className="text-lg font-mono">{status.port || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase">Company</p>
            <p className="text-lg">{status.company || '—'}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={loadStatus}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Status
        </button>
        <button
          onClick={handleSync}
          disabled={syncing || status.mode !== 'active'}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Pending Transactions'}
        </button>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div className="p-4 border border-slate-700 rounded-lg bg-slate-900/50">
          <h3 className="font-semibold mb-2">Sync Result</h3>
          <div className="flex gap-4">
            <span className="text-emerald-400">✅ Synced: {syncResult.synced}</span>
            <span className="text-red-400">❌ Failed: {syncResult.failed}</span>
          </div>
        </div>
      )}

      {/* Help */}
      {status.mode === 'unconfigured' && (
        <div className="p-4 border border-red-500/30 rounded-lg bg-red-500/5">
          <h3 className="font-semibold text-red-400 mb-2">Configuration Required</h3>
          <p className="text-sm text-slate-300 mb-2">Add to .env.local:</p>
          <pre className="text-xs bg-slate-950 p-3 rounded font-mono overflow-x-auto">
{`TALLY_HOST=your-tally-host
TALLY_PORT=9007
TALLY_COMPANY_NAME=Your Company Name`}
          </pre>
        </div>
      )}

      {status.mode === 'bypass' && (
        <div className="p-4 border border-amber-500/30 rounded-lg bg-amber-500/5">
          <h3 className="font-semibold text-amber-400 mb-2">Bypass Mode Active</h3>
          <p className="text-sm text-slate-300">
            Transactions are being stored locally. When Tally becomes available,
            use "Sync Pending Transactions" to push them to Tally.
          </p>
        </div>
      )}
    </div>
  );
}