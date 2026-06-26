"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";

type EcpRecord = {
  id: string;
  createdAt: string;
  repository: string;
  branch: string;
  commit: string;
  commitShort: string;
  lastCommitMessage: string;
  gitClean: boolean;
  gitStatus: string[];
  sprint: string;
};

type EngineeringInfo = {
  repository: string;
  branch: string;
  commit: string;
  commitShort: string;
  lastCommitMessage: string;
  gitClean: boolean;
  gitStatus: string[];
  sprint: string;
  lastEcp: EcpRecord | null;
  latest3R: string;
};

export default function EngineeringCenterPage() {
  const [info, setInfo] = useState<EngineeringInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInfo = useCallback(async () => {
    try {
      const data = await apiFetch<EngineeringInfo>("/api/engineering/info");
      setInfo(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load engineering info");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  async function createCheckpoint() {
    setCreating(true);
    setMessage(null);
    setError(null);
    try {
      const res = await apiFetch<{ ok: boolean; ecp: EcpRecord; message: string }>(
        "/api/engineering/checkpoint",
        { method: "POST" }
      );
      setMessage(`${res.message} (${res.ecp.id})`);
      await loadInfo();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create checkpoint");
    } finally {
      setCreating(false);
    }
  }

  const latest = info?.lastEcp;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-black text-slate-900">🛠️ Engineering Center</h1>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          EngineeringOS · ECP v1
        </span>
      </div>
      <p className="text-slate-500 mb-6">
        Engineering Checkpoint layer (local only). This is not 3R.
      </p>

      {loading && <p className="text-slate-500">Loading repository state…</p>}

      {info && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <Field label="Repository" value={info.repository} />
          <Field label="Current Branch" value={info.branch} mono />
          <Field label="Current Commit" value={`${info.commitShort} (${info.commit.slice(0, 12)}…)`} mono />
          <Field
            label="Git Status"
            value={info.gitClean ? "clean" : `${info.gitStatus.length} change(s)`}
            tone={info.gitClean ? "ok" : "warn"}
          />
          <Field label="Last Commit Message" value={info.lastCommitMessage} className="sm:col-span-2" />
          <Field label="Current Sprint" value={info.sprint} />
          <Field label="Last ECP" value={info.lastEcp ? info.lastEcp.id : "none yet"} />
          <Field label="Latest 3R" value={info.latest3R} className="sm:col-span-2" />
        </div>
      )}

      <button
        onClick={createCheckpoint}
        disabled={creating || loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-lg shadow-sm"
      >
        {creating ? "Creating…" : "Create Engineering Checkpoint"}
      </button>

      {message && (
        <div className="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-green-800 font-semibold">
          ✓ {message}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {/* Verification — latest Engineering Checkpoint */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Latest Engineering Checkpoint</h2>
        {latest ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Checkpoint ID" value={latest.id} mono />
              <Field label="Timestamp" value={latest.createdAt} mono />
              <Field label="Commit" value={latest.commitShort} mono />
              <Field label="Branch" value={latest.branch} mono />
              <Field label="Repository" value={latest.repository} className="sm:col-span-2" />
            </div>
          </div>
        ) : (
          <p className="text-slate-500">No checkpoints yet. Click the button above to create one.</p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  tone,
  className = "",
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "ok" | "warn";
  className?: string;
}) {
  const toneClass =
    tone === "ok" ? "text-green-700" : tone === "warn" ? "text-amber-700" : "text-slate-900";
  return (
    <div className={`rounded-lg border border-slate-200 bg-white px-4 py-3 ${className}`}>
      <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">{label}</p>
      <p className={`${mono ? "font-mono text-sm" : "text-[15px]"} font-medium break-words ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}
