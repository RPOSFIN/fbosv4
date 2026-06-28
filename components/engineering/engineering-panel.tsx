"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";

type GateResult = { name: string; status: "PASS" | "FAIL"; detail: string };
type EcpRecord = {
  id: string;
  state: string;
  createdAt: string;
  commit: string;
  commitShort: string;
  branch: string;
  repository: string;
};
type TimelineEvent = { ts: string; type: string; ecp?: string; detail: string };
type Info = {
  repository: string;
  branch: string;
  commit: string;
  commitShort: string;
  lastCommitMessage: string;
  gitClean: boolean;
  gitStatus: string[];
  sprint: string;
  latestEcp: EcpRecord | null;
  latest3R: string;
  latest3RSource: string;
  automationEnabled: boolean;
  timeline: TimelineEvent[];
  ecps: { id: string; state: string; createdAt: string; commitShort: string }[];
};
type VerifyResult = {
  gates: { gates: GateResult[]; allPass: boolean; failed: string[] };
  state: string | null;
  promotion: { tag: string } | null;
  promotionBlocked: boolean;
  blockReason?: string;
  mode: string;
  message: string;
};
type FinanceHealth = {
  available: boolean;
  total: number;
  pendingTally: number;
  failedSync: number;
  synced: number;
  verified: number;
  imported: number;
  queueSize: number;
  lastSyncAt: string | null;
  healthScore: number;
};

const LIFECYCLE = [
  "ECP_CREATED", "DEVELOPMENT", "BUILD_PASS", "RUNTIME_PASS",
  "VERIFICATION_PASS", "READY_FOR_3R", "PROMOTED_TO_3R", "CLOSED",
];

export default function EngineeringPanel({ defaultExpanded = false }: { defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [info, setInfo] = useState<Info | null>(null);
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState("latest-3r");
  const [fin, setFin] = useState<FinanceHealth | null>(null);

  const load = useCallback(async () => {
    try {
      const [i, f] = await Promise.all([
        apiFetch<Info>("/api/engineering/info"),
        apiFetch<FinanceHealth>("/api/finance/sync-health").catch(() => null),
      ]);
      setInfo(i);
      if (f) setFin(f);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Load failed" });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label); setMsg(null);
    try { await fn(); } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Action failed" });
    } finally { setBusy(null); }
  }

  const createCheckpoint = () => run("create", async () => {
    const r = await apiFetch<{ ecp: { id: string }; message: string }>("/api/engineering/checkpoint", { method: "POST" });
    setMsg({ ok: true, text: `${r.message} (${r.ecp.id})` });
    await load();
  });
  const verifyAuto = () => run("verify", async () => {
    const r = await apiFetch<VerifyResult>("/api/engineering/verify", { method: "POST" });
    setVerify(r); setMsg({ ok: !r.promotionBlocked, text: r.message }); await load();
  });
  const promoteManual = () => run("promote", async () => {
    const r = await apiFetch<VerifyResult>("/api/engineering/promote", { method: "POST" });
    setVerify(r); setMsg({ ok: !r.promotionBlocked, text: r.message }); await load();
  });
  const doRestore = (target: string) => run("restore", async () => {
    const r = await apiFetch<{ message: string }>("/api/engineering/restore", { method: "POST", body: JSON.stringify({ target }) });
    setMsg({ ok: true, text: r.message }); await load();
  });
  const toggleAutomation = () => run("automation", async () => {
    const r = await apiFetch<{ autoPromote: boolean }>("/api/engineering/automation", { method: "POST", body: JSON.stringify({ autoPromote: !info?.automationEnabled }) });
    setMsg({ ok: true, text: `Automation ${r.autoPromote ? "ENABLED" : "DISABLED"}` }); await load();
  });
  const reconcileFinance = () => run("reconcile-fin", async () => {
    const r = await apiFetch<{ message: string }>("/api/finance/reconcile", { method: "POST" });
    setMsg({ ok: true, text: r.message }); await load();
  });

  const gates = verify?.gates.gates ?? [];
  const health = gates.length ? (verify?.gates.allPass ? "HEALTHY" : "BLOCKED") : "UNVERIFIED";
  const ready = health !== "BLOCKED";
  const currentState = info?.latestEcp?.state ?? "—";

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header (always visible) */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="text-lg font-bold text-slate-900">⚙ EngineeringOS</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            {ready ? "🟢 Engineering Ready" : "🟡 Attention"}
          </span>
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Developer Tool</span>
        </span>
        <span className="text-slate-400 text-sm">{expanded ? "▲ collapse" : "▼ expand"}</span>
      </button>

      {/* Collapsed summary */}
      {!expanded && info && (
        <div className="grid grid-cols-3 gap-3 px-5 pb-4">
          <Summary label="Latest ECP" value={info.latestEcp ? `${info.latestEcp.id} (${info.latestEcp.state})` : "none"} />
          <Summary label="Latest 3R" value={info.latest3R} />
          <Summary label="Automation" value={info.automationEnabled ? "AUTO" : "MANUAL"} />
        </div>
      )}

      {/* Expanded dashboard */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-6">
          {info && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Repository" value={info.repository} />
              <Field label="Branch" value={info.branch} mono />
              <Field label="Current Commit" value={info.commitShort} mono />
              <Field label="Current Sprint" value={info.sprint} />
              <Field label="Current ECP" value={info.latestEcp ? info.latestEcp.id : "none"} />
              <Field label="Current State" value={currentState} tone={currentState === "PROMOTED_TO_3R" ? "ok" : "muted"} />
              <Field label="Latest 3R" value={info.latest3R} />
              <Field label="Engineering Health" value={health} tone={health === "HEALTHY" ? "ok" : health === "BLOCKED" ? "warn" : "muted"} />
              <Field label="Automation" value={info.automationEnabled ? "AUTO (enabled)" : "MANUAL (disabled)"} tone={info.automationEnabled ? "ok" : "warn"} />
            </div>
          )}

          <div>
            <h3 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">State Machine</h3>
            <div className="flex flex-wrap gap-1.5 items-center">
              {LIFECYCLE.map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className={s === currentState ? "px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white" : "px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500"}>{s}</span>
                  {i < LIFECYCLE.length - 1 && <span className="text-slate-300 text-xs">→</span>}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Verification Gates</h3>
            {gates.length === 0 ? (
              <p className="text-slate-500 text-sm">Run “Verify &amp; Auto-Promote” to evaluate gates.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {gates.map((g) => (
                  <div key={g.name} className={`rounded-lg border px-3 py-2 ${g.status === "PASS" ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold capitalize text-slate-800 text-sm">{g.name}</span>
                      <span className={g.status === "PASS" ? "text-emerald-700 font-bold text-sm" : "text-red-700 font-bold text-sm"}>{g.status === "PASS" ? "✓ PASS" : "✗ FAIL"}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 break-words">{g.detail}</p>
                  </div>
                ))}
              </div>
            )}
            {verify && (
              <p className={`mt-2 text-sm font-semibold ${verify.promotionBlocked ? "text-amber-700" : "text-emerald-700"}`}>
                {verify.promotionBlocked ? `🔒 Promotion blocked — ${verify.blockReason}` : "🔓 All gates passed"}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Manual Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Btn onClick={createCheckpoint} busy={busy === "create"} primary>Create Engineering Checkpoint</Btn>
              <Btn onClick={verifyAuto} busy={busy === "verify"} primary>Verify &amp; Auto-Promote</Btn>
              <Btn onClick={promoteManual} busy={busy === "promote"}>Promote Latest ECP</Btn>
              <Btn onClick={() => doRestore("latest-3r")} busy={busy === "restore"}>Restore Latest 3R</Btn>
              <Btn onClick={toggleAutomation} busy={busy === "automation"}>{info?.automationEnabled ? "Disable Automation" : "Enable Automation"}</Btn>
            </div>
            {info && info.ecps.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-slate-500">Restore Previous ECP:</span>
                <select value={restoreTarget} onChange={(e) => setRestoreTarget(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
                  <option value="latest-3r">Latest 3R</option>
                  {info.ecps.map((e) => (<option key={e.id} value={e.id}>{e.id} ({e.state})</option>))}
                </select>
                <Btn onClick={() => doRestore(restoreTarget)} busy={busy === "restore"}>Restore Selected</Btn>
              </div>
            )}
          </div>

          {msg && (
            <div className={`rounded-lg border px-4 py-3 font-medium text-sm ${msg.ok ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-700"}`}>
              {msg.ok ? "✓ " : "✗ "}{msg.text}
            </div>
          )}

          {/* Finance / Tally sync health — never hides pending or failed */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Finance / Tally Sync</h3>
              <Btn onClick={reconcileFinance} busy={busy === "reconcile-fin"}>Reconcile Tally Finance</Btn>
            </div>
            {!fin || !fin.available ? (
              <p className="text-slate-500 text-sm">finance_transactions not reachable (needs Supabase + migration 009).</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Field label="Pending Tally" value={String(fin.pendingTally)} tone={fin.pendingTally > 0 ? "warn" : "ok"} />
                <Field label="Failed Sync" value={String(fin.failedSync)} tone={fin.failedSync > 0 ? "warn" : "ok"} />
                <Field label="Verified" value={String(fin.verified)} tone="ok" />
                <Field label="Imported" value={String(fin.imported)} />
                <Field label="Queue Size" value={String(fin.queueSize)} />
                <Field label="Total Tx" value={String(fin.total)} />
                <Field label="Health Score" value={`${fin.healthScore}%`} tone={fin.healthScore >= 90 ? "ok" : "warn"} />
                <Field label="Last Sync" value={fin.lastSyncAt ? new Date(fin.lastSyncAt).toLocaleString() : "—"} />
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Engineering Timeline</h3>
            {!info || info.timeline.length === 0 ? (
              <p className="text-slate-500 text-sm">No events yet.</p>
            ) : (
              <ol className="border-l-2 border-slate-200 ml-2">
                {info.timeline.map((ev, i) => (
                  <li key={i} className="relative pl-5 pb-3">
                    <span className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full ${ev.type === "PROMOTED_TO_3R" ? "bg-emerald-500" : ev.type === "PROMOTION_BLOCKED" ? "bg-amber-500" : ev.type === "RESTORE" ? "bg-purple-500" : "bg-blue-500"}`} />
                    <p className="text-sm font-semibold text-slate-800">{ev.type}{ev.ecp ? ` · ${ev.ecp}` : ""}</p>
                    <p className="text-xs text-slate-500">{ev.ts}</p>
                    <p className="text-sm text-slate-600">{ev.detail}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
      <p className="text-sm font-medium text-slate-800 break-words">{value}</p>
    </div>
  );
}

function Field({ label, value, mono, tone }: { label: string; value: string; mono?: boolean; tone?: "ok" | "warn" | "muted" }) {
  const toneClass = tone === "ok" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : tone === "muted" ? "text-slate-500" : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">{label}</p>
      <p className={`${mono ? "font-mono text-sm" : "text-[15px]"} font-medium break-words ${toneClass}`}>{value}</p>
    </div>
  );
}

function Btn({ onClick, busy, primary, children }: { onClick: () => void; busy?: boolean; primary?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={(primary ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-white hover:bg-slate-50 text-slate-800 border border-slate-300") + " disabled:opacity-50 font-semibold px-4 py-2 rounded-lg shadow-sm text-sm"}
    >
      {busy ? "Working…" : children}
    </button>
  );
}
