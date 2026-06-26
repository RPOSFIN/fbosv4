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

const LIFECYCLE = [
  "ECP_CREATED", "DEVELOPMENT", "BUILD_PASS", "RUNTIME_PASS",
  "VERIFICATION_PASS", "READY_FOR_3R", "PROMOTED_TO_3R", "CLOSED",
];

export default function EngineeringCenterPage() {
  const [info, setInfo] = useState<Info | null>(null);
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState("latest-3r");

  const load = useCallback(async () => {
    try {
      setInfo(await apiFetch<Info>("/api/engineering/info"));
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
    setVerify(r);
    setMsg({ ok: !r.promotionBlocked, text: r.message });
    await load();
  });

  const promoteManual = () => run("promote", async () => {
    const r = await apiFetch<VerifyResult>("/api/engineering/promote", { method: "POST" });
    setVerify(r);
    setMsg({ ok: !r.promotionBlocked, text: r.message });
    await load();
  });

  const doRestore = (target: string) => run("restore", async () => {
    const r = await apiFetch<{ message: string }>("/api/engineering/restore", {
      method: "POST", body: JSON.stringify({ target }),
    });
    setMsg({ ok: true, text: r.message });
    await load();
  });

  const toggleAutomation = () => run("automation", async () => {
    const r = await apiFetch<{ autoPromote: boolean }>("/api/engineering/automation", {
      method: "POST", body: JSON.stringify({ autoPromote: !info?.automationEnabled }),
    });
    setMsg({ ok: true, text: `Automation ${r.autoPromote ? "ENABLED" : "DISABLED"}` });
    await load();
  });

  const gates = verify?.gates.gates ?? [];
  const health = gates.length ? (verify?.gates.allPass ? "HEALTHY" : "BLOCKED") : "UNVERIFIED";
  const currentState = info?.latestEcp?.state ?? "—";

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-black text-slate-900">🛠️ Engineering Center</h1>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          EngineeringOS · Recovery Engine v2
        </span>
      </div>
      <p className="text-slate-500 mb-6">Auto/Manual 3R promotion. Git is the source of truth. This is not a single point of failure — manual recovery is always available.</p>

      {/* Recovery Dashboard */}
      {info && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <Field label="Repository" value={info.repository} />
          <Field label="Current Branch" value={info.branch} mono />
          <Field label="Current Commit" value={info.commitShort} mono />
          <Field label="Latest ECP" value={info.latestEcp ? info.latestEcp.id : "none"} />
          <Field label="Current State" value={currentState} tone={currentState === "PROMOTED_TO_3R" ? "ok" : "muted"} />
          <Field label="Latest 3R" value={info.latest3R} className="" />
          <Field label="Engineering Health" value={health} tone={health === "HEALTHY" ? "ok" : health === "BLOCKED" ? "warn" : "muted"} />
          <Field label="Automation" value={info.automationEnabled ? "AUTO (enabled)" : "MANUAL (disabled)"} tone={info.automationEnabled ? "ok" : "warn"} />
          <Field label="Sprint" value={info.sprint} />
        </div>
      )}

      {/* Lifecycle state machine */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Engineering State Machine</h2>
        <div className="flex flex-wrap gap-1.5 items-center">
          {LIFECYCLE.map((s, i) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={
                s === currentState
                  ? "px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white"
                  : "px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500"
              }>{s}</span>
              {i < LIFECYCLE.length - 1 && <span className="text-slate-300">→</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Verification Gates */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Verification Gates</h2>
        {gates.length === 0 ? (
          <p className="text-slate-500 text-sm">Run “Verify &amp; Auto-Promote” to evaluate gates.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {gates.map((g) => (
              <div key={g.name} className={`rounded-lg border px-4 py-3 ${g.status === "PASS" ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold capitalize text-slate-800">{g.name}</span>
                  <span className={g.status === "PASS" ? "text-green-700 font-bold" : "text-red-700 font-bold"}>
                    {g.status === "PASS" ? "✓ PASS" : "✗ FAIL"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 break-words">{g.detail}</p>
              </div>
            ))}
          </div>
        )}
        {verify && (
          <p className={`mt-2 text-sm font-semibold ${verify.promotionBlocked ? "text-amber-700" : "text-green-700"}`}>
            {verify.promotionBlocked ? `🔒 Promotion blocked — ${verify.blockReason}` : "🔓 All gates passed"}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Manual Recovery Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={createCheckpoint} busy={busy === "create"} primary>Create Engineering Checkpoint</Btn>
          <Btn onClick={verifyAuto} busy={busy === "verify"} primary>Verify &amp; Auto-Promote</Btn>
          <Btn onClick={promoteManual} busy={busy === "promote"}>Promote Latest ECP → 3R</Btn>
          <Btn onClick={() => doRestore("latest-3r")} busy={busy === "restore"}>Restore Latest 3R</Btn>
          <Btn onClick={toggleAutomation} busy={busy === "automation"}>
            {info?.automationEnabled ? "Disable Automation" : "Enable Automation"}
          </Btn>
        </div>
        {info && info.ecps.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <select
              value={restoreTarget}
              onChange={(e) => setRestoreTarget(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="latest-3r">Latest 3R</option>
              {info.ecps.map((e) => (
                <option key={e.id} value={e.id}>{e.id} ({e.state})</option>
              ))}
            </select>
            <Btn onClick={() => doRestore(restoreTarget)} busy={busy === "restore"}>Restore Selected</Btn>
          </div>
        )}
      </div>

      {msg && (
        <div className={`mb-6 rounded-lg border px-4 py-3 font-medium ${msg.ok ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-700"}`}>
          {msg.ok ? "✓ " : "✗ "}{msg.text}
        </div>
      )}

      {/* Engineering Timeline */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Engineering Timeline</h2>
        {!info || info.timeline.length === 0 ? (
          <p className="text-slate-500 text-sm">No events yet.</p>
        ) : (
          <ol className="border-l-2 border-slate-200 ml-2">
            {info.timeline.map((ev, i) => (
              <li key={i} className="relative pl-5 pb-3">
                <span className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full ${ev.type === "PROMOTED_TO_3R" ? "bg-green-500" : ev.type === "PROMOTION_BLOCKED" ? "bg-amber-500" : ev.type === "RESTORE" ? "bg-purple-500" : "bg-blue-500"}`} />
                <p className="text-sm font-semibold text-slate-800">
                  {ev.type}{ev.ecp ? ` · ${ev.ecp}` : ""}
                </p>
                <p className="text-xs text-slate-500">{ev.ts}</p>
                <p className="text-sm text-slate-600">{ev.detail}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Previous ECPs */}
      {info && info.ecps.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Engineering Checkpoints</h2>
          <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr><th className="text-left px-3 py-2">ECP</th><th className="text-left px-3 py-2">State</th><th className="text-left px-3 py-2">Commit</th><th className="text-left px-3 py-2">Created</th></tr>
            </thead>
            <tbody>
              {info.ecps.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono font-semibold">{e.id}</td>
                  <td className="px-3 py-2">{e.state}</td>
                  <td className="px-3 py-2 font-mono">{e.commitShort}</td>
                  <td className="px-3 py-2 text-slate-500">{e.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono, tone, className = "" }: {
  label: string; value: string; mono?: boolean; tone?: "ok" | "warn" | "muted"; className?: string;
}) {
  const toneClass = tone === "ok" ? "text-green-700" : tone === "warn" ? "text-amber-700" : tone === "muted" ? "text-slate-500" : "text-slate-900";
  return (
    <div className={`rounded-lg border border-slate-200 bg-white px-4 py-3 ${className}`}>
      <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">{label}</p>
      <p className={`${mono ? "font-mono text-sm" : "text-[15px]"} font-medium break-words ${toneClass}`}>{value}</p>
    </div>
  );
}

function Btn({ onClick, busy, primary, children }: {
  onClick: () => void; busy?: boolean; primary?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={
        (primary
          ? "bg-blue-600 hover:bg-blue-700 text-white"
          : "bg-white hover:bg-slate-50 text-slate-800 border border-slate-300") +
        " disabled:opacity-50 font-semibold px-4 py-2.5 rounded-lg shadow-sm text-sm"
      }
    >
      {busy ? "Working…" : children}
    </button>
  );
}
