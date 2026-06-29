"use client"; // REQUIRED BY NEXT.js 16

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";

/* ===========================================================
   TYPES (Consolidated with lib/types)
=========================================================== */

// Existing types (preserved)
type GateResult = {
  name: string;
  status: "PASS" | "FAIL";
  detail: string;
};

type TimelineEvent = {
  ts: string;
  type: string;
  detail: string;
  ecp?: string;
};

type EcpRecord = {
  id: string;
  state: string;
  createdAt: string;
  commit: string;
  commitShort: string;
  branch: string;
  repository: string;
};

type ResumePackage = {
  project?: string;
  module?: string;
  branch?: string;
  ecp?: string;
  recovery?: string;
  files?: string[];
  work?: string[];
  tasks?: string[];
  rules?: string[];
  issues?: string[];
};

type Info = {
  repository: string;
  branch: string;
  commit: string;
  commitShort: string;
  lastCommitMessage?: string;
  gitClean?: boolean;
  gitStatus?: string[];
  sprint: string;
  latestEcp: EcpRecord | null;
  latest3R?: string;
  latest3RSource?: string;
  automationEnabled: boolean;
  timeline?: TimelineEvent[];
  ecps?: {
    id: string;
    state: string;
    createdAt: string;
    commitShort: string;
  }[];
};

type VerifyResult = {
  gates: {
    gates: GateResult[];
    allPass: boolean;
    failed: string[];
  };
  state?: string | null;
  promotion?: {
    tag: string;
  } | null;
  promotionBlocked?: boolean;
  blockReason?: string;
  mode?: string;
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

/* ===========================================================
   LIFECYCLE & CONSTANTS
=========================================================== */

const LIFECYCLE = [
  "ECP_CREATED",
  "DEVELOPMENT",
  "BUILD_PASS",
  "RUNTIME_PASS",
  "VERIFICATION_PASS",
  "READY_FOR_3R",
  "PROMOTED_TO_3R",
  "CLOSED",
];

/* ===========================================================
   COMPONENT
=========================================================== */

export default function EngineeringPanel({
  defaultExpanded = false,
}: {
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [busy, setBusy] = useState<string | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [resumeData, setResumeData] = useState<ResumePackage | null>(null);
  const [restoreTarget, setRestoreTarget] = useState("latest-3r");
  const [fin, setFin] = useState<FinanceHealth | null>(null);

  const [msg, setMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const [engineeringInfo, financeInfo] = await Promise.all([
        apiFetch<Info>("/api/engineering/info"),
        apiFetch<FinanceHealth>("/api/finance/sync-health").catch(() => null),
      ]);

      setInfo(engineeringInfo);
      if (financeInfo) setFin(financeInfo);
    } catch (err) {
      console.error(err);
      setMsg({
        ok: false,
        text:
          err instanceof Error
            ? err.message
            : "Unable to load Engineering information.",
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setMsg(null);

    try {
      await fn();
    } catch (err) {
      console.error(err);
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Operation Failed",
      });
    } finally {
      setBusy(null);
    }
  }

  async function createCheckpoint() {
    return run("checkpoint", async () => {
      const result = await apiFetch<{
        ecp: { id: string };
        message: string;
      }>("/api/engineering/checkpoint", {
        method: "POST",
      });

      setMsg({
        ok: true,
        text: `${result.message} (${result.ecp.id})`,
      });

      await load();
    });
  }

  async function verifyProject() {
    return run("verify", async () => {
      const result = await apiFetch<VerifyResult>("/api/engineering/verify", {
        method: "POST",
      });

      setVerify(result);
      setMsg({
        ok: !result.promotionBlocked,
        text: result.message,
      });

      await load();
    });
  }

  async function promoteManual() {
    return run("promote", async () => {
      const result = await apiFetch<VerifyResult>("/api/engineering/promote", {
        method: "POST",
      });

      setVerify(result);
      setMsg({
        ok: !result.promotionBlocked,
        text: result.message,
      });

      await load();
    });
  }

  async function generateResume() {
    return run("resume", async () => {
      const result = await apiFetch<ResumePackage>(
        "/api/engineering/resume-package"
      );

      setResumeData(result);
      setMsg({
        ok: true,
        text: "Resume Package Generated.",
      });
    });
  }

  async function doRestore(target: string) {
    return run("restore", async () => {
      const result = await apiFetch<{ message: string }>(
        "/api/engineering/restore",
        {
          method: "POST",
          body: JSON.stringify({ target }),
        }
      );

      setMsg({
        ok: true,
        text: result.message,
      });

      await load();
    });
  }

  async function toggleAutomation() {
    return run("automation", async () => {
      const result = await apiFetch<{ autoPromote: boolean }>(
        "/api/engineering/automation",
        {
          method: "POST",
          body: JSON.stringify({
            autoPromote: !info?.automationEnabled,
          }),
        }
      );

      setMsg({
        ok: true,
        text: `Automation ${result.autoPromote ? "ENABLED" : "DISABLED"}`,
      });

      await load();
    });
  }

  async function reconcileFinance() {
    return run("reconcile-fin", async () => {
      const result = await apiFetch<{ message: string }>(
        "/api/finance/reconcile",
        {
          method: "POST",
        }
      );

      setMsg({
        ok: true,
        text: result.message,
      });

      await load();
    });
  }

  const gates = verify?.gates.gates ?? [];

  const engineeringHealth = useMemo(() => {
    if (!verify) return "UNVERIFIED";
    return verify.gates.allPass ? "HEALTHY" : "BLOCKED";
  }, [verify]);

  const readyFor3R = engineeringHealth === "HEALTHY";

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold">⚙ EngineeringOS</span>

          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${
              engineeringHealth === "HEALTHY"
                ? "bg-green-100 text-green-700"
                : engineeringHealth === "BLOCKED"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {engineeringHealth}
          </span>
        </div>

        <span className="text-sm text-slate-500">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="space-y-6 border-t px-5 py-5">
          {msg && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                msg.ok
                  ? "border-green-300 bg-green-50 text-green-700"
                  : "border-red-300 bg-red-50 text-red-700"
              }`}
            >
              {msg.text}
            </div>
          )}

          {/* =======================================================
              FINANCE / TALLY SYNC
          ======================================================== */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Finance / Tally Sync
              </h3>

              <ActionButton
                loading={busy === "reconcile-fin"}
                onClick={reconcileFinance}
                variant="secondary"
              >
                Reconcile Tally Finance
              </ActionButton>
            </div>

            {!fin || !fin.available ? (
              <p className="text-sm text-slate-500">
                finance_transactions not reachable (needs Supabase + migration
                009).
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Field
                  label="Pending Tally"
                  value={String(fin.pendingTally)}
                  tone={fin.pendingTally > 0 ? "warn" : "ok"}
                />
                <Field
                  label="Failed Sync"
                  value={String(fin.failedSync)}
                  tone={fin.failedSync > 0 ? "warn" : "ok"}
                />
                <Field
                  label="Verified"
                  value={String(fin.verified)}
                  tone="ok"
                />
                <Field label="Imported" value={String(fin.imported)} />
                <Field label="Queue Size" value={String(fin.queueSize)} />
                <Field label="Total Tx" value={String(fin.total)} />
                <Field
                  label="Health Score"
                  value={`${fin.healthScore}%`}
                  tone={fin.healthScore >= 90 ? "ok" : "warn"}
                />
                <Field
                  label="Last Sync"
                  value={
                    fin.lastSyncAt
                      ? new Date(fin.lastSyncAt).toLocaleString()
                      : "—"
                  }
                />
              </div>
            )}
          </div>

          {/* =======================================================
              SUMMARY
          ======================================================== */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <InfoCard title="Repository" value={info?.repository} />
            <InfoCard title="Branch" value={info?.branch} />
            <InfoCard title="Commit" value={info?.commitShort} />
            <InfoCard title="Sprint" value={info?.sprint} />
            <InfoCard title="Current ECP" value={info?.latestEcp?.id} />
            <InfoCard title="Current State" value={info?.latestEcp?.state} />
            <InfoCard
              title="Automation"
              value={info?.automationEnabled ? "Enabled" : "Disabled"}
            />
            <InfoCard title="Ready For 3R" value={readyFor3R ? "YES" : "NO"} />
          </div>

          {/* =======================================================
              ACTIONS
          ======================================================== */}
          <div className="flex flex-wrap gap-3">
            <ActionButton
              loading={busy === "checkpoint"}
              onClick={createCheckpoint}
            >
              Create ECP
            </ActionButton>

            <ActionButton loading={busy === "verify"} onClick={verifyProject}>
              Verify & Auto Promote
            </ActionButton>

            <ActionButton
              loading={busy === "promote"}
              onClick={promoteManual}
              variant="secondary"
            >
              Promote Manual
            </ActionButton>

            <ActionButton loading={busy === "resume"} onClick={generateResume}>
              Resume Package
            </ActionButton>

            <ActionButton
              loading={busy === "automation"}
              onClick={toggleAutomation}
              variant="secondary"
            >
              {info?.automationEnabled ? "Disable Automation" : "Enable Automation"}
            </ActionButton>
          </div>

          {/* =======================================================
              VERIFICATION GATES
          ======================================================== */}
          <div className="rounded-lg border p-5">
            <h3 className="mb-4 font-semibold">Verification Gates</h3>

            {gates.length === 0 ? (
              <p className="text-slate-500">
                Verification has not been executed.
              </p>
            ) : (
              <div className="space-y-3">
                {gates.map((gate) => (
                  <div
                    key={gate.name}
                    className="flex items-start justify-between rounded-lg border p-3"
                  >
                    <div>
                      <div className="font-medium">{gate.name}</div>
                      <div className="text-sm text-slate-500">{gate.detail}</div>
                    </div>

                    <span
                      className={`font-bold ${
                        gate.status === "PASS"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {gate.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* =======================================================
              RESUME PACKAGE
          ======================================================== */}
          <div className="rounded-lg border p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Resume Package</h3>

              {!resumeData && (
                <button
                  onClick={generateResume}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
                >
                  Generate
                </button>
              )}
            </div>

            {resumeData && (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  <InfoCard title="Project" value={resumeData.project} />
                  <InfoCard title="Module" value={resumeData.module} />
                  <InfoCard title="Branch" value={resumeData.branch} />
                  <InfoCard title="ECP" value={resumeData.ecp} />
                  <InfoCard title="Latest 3R" value={resumeData.recovery} />
                </div>

                <div className="mt-4 space-y-4">
                  <ListCard title="Files To Modify" items={resumeData.files} />
                  <ListCard title="Completed Work" items={resumeData.work} />
                  <ListCard title="Pending Tasks" items={resumeData.tasks} />
                  <ListCard title="Engineering Rules" items={resumeData.rules} />
                  <ListCard title="Known Issues" items={resumeData.issues} />
                </div>
              </>
            )}
          </div>

          {/* =======================================================
              ENGINEERING TIMELINE
          ======================================================== */}
          <div className="rounded-lg border p-5">
            <h3 className="mb-4 font-semibold">Engineering Timeline</h3>

            {info?.timeline?.length ? (
              <div className="space-y-3">
                {info.timeline.map((item, index) => (
                  <div
                    key={`${item.ts}-${item.type}-${index}`}
                    className="flex gap-4 border-l-2 border-slate-300 pl-4"
                  >
                    <div className="min-w-[130px] text-xs text-slate-500">
                      {item.ts}
                    </div>

                    <div>
                      <div className="font-medium">
                        {item.type}
                        {item.ecp ? ` · ${item.ecp}` : ""}
                      </div>
                      <div className="text-sm text-slate-500">{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">Timeline unavailable.</p>
            )}
          </div>

          {/* =======================================================
              ENGINEERING LIFECYCLE
          ======================================================== */}
          <div className="rounded-lg border p-5">
            <h3 className="mb-4 font-semibold">Engineering Lifecycle</h3>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {LIFECYCLE.map((step) => (
                <div
                  key={step}
                  className="rounded-lg border bg-slate-50 p-3 text-center"
                >
                  <div className="text-xs font-semibold">{step}</div>
                </div>
              ))}
            </div>
          </div>

          {/* =======================================================
              RESTORE
          ======================================================== */}
          <div className="rounded-lg border p-5">
            <h3 className="mb-4 font-semibold">Restore</h3>

            <div className="flex flex-wrap items-center gap-3">
              <input
                value={restoreTarget}
                onChange={(e) => setRestoreTarget(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
                placeholder="latest-3r"
              />

              <ActionButton
                loading={busy === "restore"}
                onClick={() => doRestore(restoreTarget)}
                variant="secondary"
              >
                Restore Target
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===========================================================
   HELPER COMPONENTS (PRESERVED)
=========================================================== */

function InfoCard({
  title,
  value,
}: {
  title: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
}

function ListCard({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 font-semibold text-slate-800">{title}</h3>

      {items && items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={`${title}-${index}`}
              className="rounded-md bg-slate-50 px-3 py-2 text-sm"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-slate-400">No Data</div>
      )}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  loading,
  variant = "primary",
}: {
  children: ReactNode;
  onClick: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={[
        "rounded-lg px-4 py-2 text-sm font-semibold transition-all",
        loading ? "cursor-not-allowed opacity-50" : "",
        variant === "primary"
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "border border-slate-300 bg-white hover:bg-slate-50",
      ].join(" ")}
    >
      {loading ? "Working..." : children}
    </button>
  );
}

function Field({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "warn";
}) {
  const toneClass =
    tone === "ok"
      ? "border-green-200 bg-green-50 text-green-700"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-white text-slate-700";

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold">{value}</div>
    </div>
  );
}