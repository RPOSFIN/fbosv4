"use client";



import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { apiFetch } from "@/lib/api/client";

import type {

  ConnectorName,

  IntegrationDisplayStatus,

  IntegrationRecord,

  IntegrationStatus,

} from "@/lib/integrations/types";

import type { IntegrationSyncData } from "@/lib/integrations/sync-data";
import { GSheetShareBanner } from "@/components/integrations/gsheet-share-banner";
import { IntegrationRoutePanel } from "@/components/integrations/integration-route-panel";
import { maskSecret } from "@/lib/integrations/mask-config";



type IntegrationsResponse = {

  connectors: IntegrationRecord[];

  summary: {

    gsheet: IntegrationStatus;

    clickup: IntegrationDisplayStatus;

    tally: IntegrationDisplayStatus;

    connected: number;

    pending: number;

    error: number;

    demo?: number;

  };

  dbTable: boolean;

  syncData?: IntegrationSyncData;

};



type SyncActionResult = {

  message: string;

  demo?: boolean;

  leadsImported?: number;

  leadsUpdated?: number;

  leadsSkipped?: number;

  clientsImported?: number;

  healthCheck?: boolean;

  tasksStored?: number;

  leadsSynced?: number;

  recordsQueued?: number;

  fixSteps?: string[];

  source?: string;

};



const CONNECTOR_META: Record<

  ConnectorName,

  { title: string; description: string; syncPath: string; syncLabel: string }

> = {

  gsheet: {

    title: "Google Sheets",

    description: "Lead sync via Apps Script webapp → Leads table",

    syncPath: "/api/integrations/gsheet/sync",

    syncLabel: "Sync Now",

  },

  clickup: {

    title: "ClickUp",

    description: "Tasks, spaces, and execution sync",

    syncPath: "/api/integrations/clickup/sync",

    syncLabel: "Sync ClickUp",

  },

  tally: {

    title: "Tally",

    description: "Finance ledger sync",

    syncPath: "/api/integrations/tally/sync",

    syncLabel: "Sync Tally",

  },

};



export default function IntegrationsPage() {

  const [data, setData] = useState<IntegrationsResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [actionMsg, setActionMsg] = useState<{

    text: string;

    ok: boolean;

  } | null>(null);

  const [lastSyncResults, setLastSyncResults] = useState<

    Partial<Record<ConnectorName, SyncActionResult & { syncedAt: string }>>

  >({});

  const [busy, setBusy] = useState<ConnectorName | "all" | null>(null);



  const load = useCallback(async () => {

    setLoading(true);

    try {

      const res = await apiFetch<IntegrationsResponse>("/api/integrations");

      setData(res);

    } catch (e) {

      setActionMsg({

        text: e instanceof Error ? e.message : "Failed to load integrations",

        ok: false,

      });

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    load();

  }, [load]);



  async function runAction(name: ConnectorName) {

    const meta = CONNECTOR_META[name];

    setBusy(name);

    setActionMsg(null);

    try {

      const result = await apiFetch<SyncActionResult>(meta.syncPath, {

        method: "POST",

      });

      const syncedAt = new Date().toISOString();

      setLastSyncResults((prev) => ({ ...prev, [name]: { ...result, syncedAt } }));

      setActionMsg({ text: result.message, ok: true });

      await load();

    } catch (e) {

      setActionMsg({

        text: e instanceof Error ? e.message : "Action failed",

        ok: false,

      });

    } finally {

      setBusy(null);

    }

  }



  async function syncAll() {

    setBusy("all");

    setActionMsg(null);

    try {

      const result = await apiFetch<{

        allOk: boolean;

        syncedAt: string;

        results: Record<string, SyncActionResult>;

      }>("/api/integrations/sync-all", { method: "POST" });

      const summary = Object.entries(result.results)

        .map(([k, v]) => `${k}: ${v.message}`)

        .join(" · ");

      setActionMsg({ text: summary, ok: result.allOk });

      const stamped = Object.fromEntries(

        Object.entries(result.results).map(([k, v]) => [

          k,

          { ...v, syncedAt: result.syncedAt },

        ])

      ) as Partial<Record<ConnectorName, SyncActionResult & { syncedAt: string }>>;

      setLastSyncResults((prev) => ({ ...prev, ...stamped }));

      await load();

    } catch (e) {

      setActionMsg({

        text: e instanceof Error ? e.message : "Sync all failed",

        ok: false,

      });

    } finally {

      setBusy(null);

    }

  }



  return (

    <div className="p-8">

      <div className="flex items-start justify-between gap-4 mb-6">

        <div>

          <h1 className="text-3xl font-bold">Integration Hub</h1>

          <p className="mt-2 text-slate-400">

            Connect FBOS with Google Sheets, ClickUp, and Tally

          </p>

        </div>

        <div className="flex flex-col items-end gap-2">

          <Link

            href="/"

            className="text-sm text-cyan-400 hover:text-cyan-300"

          >

            ← Master Dashboard

          </Link>

          <Link

            href="/settings"

            className="text-sm text-slate-400 hover:text-slate-300"

          >

            Env config →

          </Link>

        </div>

      </div>



      <GSheetShareBanner connectors={data?.connectors} />

      <IntegrationRoutePanel />

      {data && (

        <div className="mb-4 flex flex-wrap gap-2 text-xs">

          <SummaryChip label="Connected" value={data.summary.connected} tone="green" />

          <SummaryChip label="Pending" value={data.summary.pending} tone="amber" />

          <SummaryChip label="Error" value={data.summary.error} tone="red" />

          {(data.summary.demo ?? 0) > 0 && (

            <SummaryChip label="Demo" value={data.summary.demo!} tone="cyan" />

          )}

        </div>

      )}



      {data && !data.dbTable && (

        <p className="mb-4 text-sm text-amber-300">

          integrations table not found — using env-based status. Run{" "}

          <code className="text-amber-200">

            npm run db:integrations

          </code>

        </p>

      )}



      {actionMsg && (

        <p

          className={`mb-4 text-sm border rounded-lg px-4 py-2 ${

            actionMsg.ok

              ? "text-green-300 border-green-800/50 bg-green-950/20"

              : "text-red-300 border-red-800/50 bg-red-950/20"

          }`}

        >

          {actionMsg.text}

        </p>

      )}



      <div className="mb-6">

        <button

          onClick={syncAll}

          disabled={busy !== null || loading}

          className="rounded-lg bg-slate-800 border border-slate-600 px-5 py-2.5 text-sm hover:bg-slate-700 disabled:opacity-50"

        >

          {busy === "all" ? "Syncing hub (Tally → ClickUp → GSheet)…" : "Sync All Hub (Tally → ClickUp → GSheet)"}

        </button>

      </div>



      {loading ? (

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {[1, 2, 3].map((i) => (

            <div

              key={i}

              className="border border-slate-800 rounded-xl p-5 bg-slate-900/40 animate-pulse h-44"

            />

          ))}

        </div>

      ) : (

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {(data?.connectors || []).map((connector) => (

            <ConnectorCard

              key={connector.connector_name}

              connector={connector}

              busy={busy === connector.connector_name}

              onAction={() => runAction(connector.connector_name)}

            />

          ))}

        </div>

      )}



      {data?.syncData && (
        <SyncedDataPanel syncData={data.syncData} connectors={data.connectors} />
      )}

      {data && data.connectors.some((c) => c.last_sync_at || c.config.lastMessage) && (

        <section className="mt-8 border border-slate-800 rounded-xl p-5 bg-slate-900/30">

          <h2 className="text-lg font-semibold mb-3">Last Sync Results</h2>

          <p className="text-xs text-slate-500 mb-4">

            Google Sheets rows are written to the{" "}

            <Link href="/leads" className="text-cyan-500 hover:underline">

              Leads

            </Link>{" "}

            page. Tally records go to the finance import queue.             ClickUp tasks are in{" "}

            <Link href="/clickup-tasks" className="text-cyan-500 hover:underline">

              /clickup-tasks

            </Link>

            .

          </p>

          <div className="space-y-3">

            {data.connectors.map((connector) => (

              <SyncResultRow

                key={connector.connector_name}

                connector={connector}

                liveResult={lastSyncResults[connector.connector_name]}

              />

            ))}

          </div>

        </section>

      )}



      <div className="mt-8 text-sm text-slate-500">

        <p>

          Configure env vars in <code>.env.local</code> — masked view on{" "}

          <Link href="/settings" className="text-cyan-500 hover:underline">

            Settings

          </Link>

          . ClickUp token: add <code>CLICKUP_API_TOKEN</code> to{" "}

          <code>.env.local</code> and restart the dev server.

        </p>

      </div>

    </div>

  );

}



function SummaryChip({

  label,

  value,

  tone,

}: {

  label: string;

  value: number;

  tone: "green" | "amber" | "red" | "cyan";

}) {

  const styles = {

    green: "border-green-500/40 text-green-400",

    amber: "border-amber-500/40 text-amber-400",

    red: "border-red-500/40 text-red-400",

    cyan: "border-cyan-500/40 text-cyan-400",

  };

  return (

    <span className={`rounded-full border px-3 py-1 ${styles[tone]}`}>

      {label}: {value}

    </span>

  );

}



function ConnectorCard({

  connector,

  busy,

  onAction,

}: {

  connector: IntegrationRecord;

  busy: boolean;

  onAction: () => void;

}) {

  const meta = CONNECTOR_META[connector.connector_name];

  const displayStatus: IntegrationDisplayStatus = connector.demo

    ? "demo"

    : connector.status;



  return (

    <div className="border border-slate-800 rounded-xl p-5 bg-slate-900/40">

      <div className="flex items-center justify-between gap-2 mb-2">

        <h2 className="text-lg font-semibold">{meta.title}</h2>

        <StatusBadge status={displayStatus} />

      </div>

      <p className="text-sm text-slate-400 mb-4">{meta.description}</p>

      {connector.connector_name === "tally" && (
        <>
          <TallyConfigSummary connector={connector} />
          <TallyCloudHostEditor connector={connector} />
        </>
      )}



      {connector.demo && connector.connector_name !== "tally" && (

        <p className="text-xs text-cyan-400 mb-2">

          Running in demo mode — add API credentials for live sync

        </p>

      )}



      {connector.last_sync_at && (

        <p className="text-xs text-slate-500 mb-2">

          Last sync: {new Date(connector.last_sync_at).toLocaleString()}

        </p>

      )}



      <SyncSummary connector={connector} />



      {connector.error_message && (

        <p className="text-xs text-red-400 mb-2">{connector.error_message}</p>

      )}

      <FixStepsBlock connector={connector} />



      <button

        onClick={onAction}

        disabled={busy}

        className="mt-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm hover:bg-cyan-500 disabled:opacity-50"

      >

        {busy ? "Working…" : meta.syncLabel}

      </button>

    </div>

  );

}




function TallyConfigSummary({ connector }: { connector: IntegrationRecord }) {
  const envHost = String(connector.config.host || "");
  const dbHost = String(connector.config.tallyHost || "");
  const host = dbHost || envHost || "(not set)";
  const port = String(connector.config.port || "9007");
  const companyRaw = String(connector.config.company || "");
  const hasCompany = Boolean(connector.config.hasCompany ?? companyRaw.trim());
  const isLocalhost =
    host === "localhost" || host === "127.0.0.1" || host === "(not set)";
  const configured = Boolean((dbHost || (envHost && !isLocalhost)) && hasCompany);
  const lastMessage =
    typeof connector.config.lastMessage === "string" ? connector.config.lastMessage : "";
  const gatewayIssue =
    connector.demo &&
    (lastMessage.toLowerCase().includes("unreachable") ||
      lastMessage.toLowerCase().includes("cannot reach") ||
      lastMessage.toLowerCase().includes("localhost"));

  return (
    <div className="mb-3 rounded-lg border border-slate-700/60 bg-slate-950/40 px-3 py-2 text-xs text-slate-300 space-y-1">
      <p>
        <span className="text-slate-500">Cloud gateway:</span>{" "}
        {host === "(not set)" ? (
          <span className="text-amber-400">not set</span>
        ) : (
          <>
            http://{host}:{port}
            {isLocalhost && <span className="text-amber-400 ml-1">(localhost — use cloud IP)</span>}
          </>
        )}
      </p>
      <p>
        <span className="text-slate-500">Company:</span>{" "}
        {hasCompany ? maskSecret(companyRaw, 6) : "Not set in .env.local"}
      </p>
      <p>
        <span className="text-slate-500">Mode:</span>{" "}
        {configured ? (
          <span className="text-green-400">Tally Cloud configured</span>
        ) : (
          <span className="text-amber-400">Needs cloud host + company</span>
        )}
      </p>
      {(gatewayIssue || isLocalhost) && (
        <p className="text-amber-300 pt-1 border-t border-slate-800/60">
          Tally is on Cloud — set TALLY_HOST to your cloud server IP/hostname (port {port}), not localhost.
          Add <code className="text-amber-200">TALLY_HOST=your-cloud-server</code> in .env.local or use the field below.
        </p>
      )}
      {connector.demo && !gatewayIssue && configured && (
        <p className="text-cyan-300/90 pt-1">
          Live sync targets Tally cloud gateway at {host}:{port}. Company name must match Tally exactly.
        </p>
      )}
    </div>
  );
}

function TallyCloudHostEditor({ connector }: { connector: IntegrationRecord }) {
  const [host, setHost] = useState(String(connector.config.tallyHost || connector.config.host || ""));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState(true);
  const port = String(connector.config.port || "9007");
  const company = String(connector.config.company || "Flexiflair Tech Private Limited");

  async function saveAndTest() {
    const trimmed = host.trim();
    if (!trimmed) {
      setMsgOk(false);
      setMsg("Enter Tally Cloud server IP or hostname (e.g. 203.0.113.50 or tally.yourdomain.com)");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await apiFetch<{
        gateway: { ok: boolean; message: string; endpoint: string };
        envUpdated: boolean;
      }>("/api/integrations/tally/config", {
        method: "POST",
        body: JSON.stringify({ host: trimmed, port, company }),
      });
      setMsgOk(res.gateway.ok);
      setMsg(
        res.gateway.ok
          ? `Connected — ${res.gateway.message}`
          : `Saved host ${trimmed}:${port} — ${res.gateway.message}`
      );
    } catch (e) {
      setMsgOk(false);
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function testOnly() {
    const trimmed = host.trim();
    if (!trimmed) {
      setMsgOk(false);
      setMsg("Enter cloud host first");
      return;
    }
    setTesting(true);
    setMsg(null);
    try {
      const res = await apiFetch<{ ok: boolean; message: string; endpoint: string }>(
        "/api/integrations/tally/test",
        {
          method: "POST",
          body: JSON.stringify({ host: trimmed, port, company }),
        }
      );
      setMsgOk(res.ok);
      setMsg(res.message);
    } catch (e) {
      setMsgOk(false);
      setMsg(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="mb-3 rounded-lg border border-cyan-800/30 bg-cyan-950/10 px-3 py-2 text-xs space-y-2">
      <p className="text-slate-400 font-medium">Tally Cloud Host (IP or hostname — not localhost)</p>
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="e.g. 203.0.113.50 or tally.flexiflair.com"
          className="flex-1 min-w-[200px] rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
        />
        <button
          onClick={saveAndTest}
          disabled={saving || testing}
          className="rounded bg-cyan-700 px-3 py-1.5 hover:bg-cyan-600 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save & Test"}
        </button>
        <button
          onClick={testOnly}
          disabled={saving || testing}
          className="rounded border border-slate-600 px-3 py-1.5 hover:border-cyan-500 disabled:opacity-50"
        >
          {testing ? "Testing…" : "Test Gateway"}
        </button>
      </div>
      <p className="text-slate-500">
        Port <strong>{port}</strong> · Company <strong>{company}</strong> · Saves to .env.local + DB (no manual restart needed for sync)
      </p>
      {msg && (
        <p className={msgOk ? "text-green-300" : "text-amber-300"}>{msg}</p>
      )}
    </div>
  );
}

function SyncSummary({ connector }: { connector: IntegrationRecord }) {

  const cfg = connector.config;

  const message = typeof cfg.lastMessage === "string" ? cfg.lastMessage : null;



  if (connector.connector_name === "gsheet") {

    const leadsImported = Number(cfg.leadsImported ?? 0);
    const leadsUpdated = Number(cfg.leadsUpdated ?? 0);
    const leadsSkipped = Number(cfg.leadsSkipped ?? 0);

    const healthCheck = Boolean(cfg.healthCheck);

    if (!message && !connector.last_sync_at) return null;



    return (

      <div className="mb-2 rounded-lg border border-slate-700/60 bg-slate-950/40 px-3 py-2 text-xs text-slate-300">

        {healthCheck && !leadsImported && !leadsUpdated && !leadsSkipped && (

          <p className="text-green-400">Health check OK — no new rows in sheet</p>

        )}

        {(leadsImported > 0 || leadsUpdated > 0 || leadsSkipped > 0) && (

          <p>

            {leadsImported > 0 && `${leadsImported} inserted`}
            {leadsImported > 0 && leadsUpdated > 0 && ", "}
            {leadsUpdated > 0 && `${leadsUpdated} updated`}
            {leadsSkipped > 0 && `, ${leadsSkipped} skipped`}
            {" → "}

            <Link href="/leads" className="text-cyan-400 hover:underline">

              View Leads

            </Link>

          </p>

        )}

        {message && <p className="text-slate-400 mt-1">{message}</p>}

      </div>

    );

  }



  if (connector.connector_name === "clickup") {

    const tasksStored = Number(cfg.tasksStored ?? 0);
    const leadsImported = Number(cfg.leadsImported ?? 0);
    const leadsUpdated = Number(cfg.leadsUpdated ?? 0);
    const leadsSkipped = Number(cfg.leadsSkipped ?? 0);
    const leadsSynced = Number(cfg.leadsSynced ?? leadsImported + leadsUpdated);

    if (!message && !tasksStored && !leadsSynced) return null;

    return (

      <div className="mb-2 rounded-lg border border-slate-700/60 bg-slate-950/40 px-3 py-2 text-xs text-slate-300">

        {tasksStored > 0 && (

          <p>

            {tasksStored} task(s) stored →{" "}

            <Link href="/clickup-tasks" className="text-cyan-400 hover:underline">

              View Tasks

            </Link>

          </p>

        )}

        {(leadsSynced > 0 || leadsSkipped > 0) && (
          <p>
            {leadsImported > 0 && `${leadsImported} inserted`}
            {leadsImported > 0 && leadsUpdated > 0 && ", "}
            {leadsUpdated > 0 && `${leadsUpdated} updated`}
            {leadsSkipped > 0 && `, ${leadsSkipped} skipped`}
            {" → "}
            <Link href="/lead-master" className="text-cyan-400 hover:underline">
              Lead Master
            </Link>
          </p>
        )}

        {message && <p className="text-slate-400">{message}</p>}

      </div>

    );

  }



  if (connector.connector_name === "tally") {

    const recordsQueued = Number(cfg.recordsQueued ?? 0);

    if (!message && !recordsQueued) return null;

    return (

      <div className="mb-2 rounded-lg border border-slate-700/60 bg-slate-950/40 px-3 py-2 text-xs text-slate-300">

        {recordsQueued > 0 && <p>{recordsQueued} finance record(s) queued</p>}

        {message && <p className="text-slate-400">{message}</p>}

      </div>

    );

  }



  return null;

}



function SyncResultRow({

  connector,

  liveResult,

}: {

  connector: IntegrationRecord;

  liveResult?: SyncActionResult & { syncedAt: string };

}) {

  const meta = CONNECTOR_META[connector.connector_name];

  const cfg = connector.config;

  const message =

    liveResult?.message ||

    (typeof cfg.lastMessage === "string" ? cfg.lastMessage : null);

  const syncedAt =

    liveResult?.syncedAt || connector.last_sync_at || null;



  if (!syncedAt && !message) return null;



  const details: string[] = [];

  if (connector.connector_name === "gsheet") {

    const imported = liveResult?.leadsImported ?? Number(cfg.leadsImported ?? 0);
    const updated = liveResult?.leadsUpdated ?? Number(cfg.leadsUpdated ?? 0);
    const skipped = liveResult?.leadsSkipped ?? Number(cfg.leadsSkipped ?? 0);

    const health = liveResult?.healthCheck ?? Boolean(cfg.healthCheck);

    if (health && !imported && !updated) details.push("Health check only");

    const parts: string[] = [];
    if (imported) parts.push(`${imported} inserted`);
    if (updated) parts.push(`${updated} updated`);
    if (skipped) parts.push(`${skipped} skipped`);
    if (parts.length) details.push(`Leads: ${parts.join(", ")} → /leads`);

  }

  if (connector.connector_name === "clickup") {

    const tasks = liveResult?.tasksStored ?? Number(cfg.tasksStored ?? 0);
    const imported = liveResult?.leadsImported ?? Number(cfg.leadsImported ?? 0);
    const updated = liveResult?.leadsUpdated ?? Number(cfg.leadsUpdated ?? 0);
    const skipped = liveResult?.leadsSkipped ?? Number(cfg.leadsSkipped ?? 0);

    if (tasks) details.push(`${tasks} task(s) stored`);
    const leadParts: string[] = [];
    if (imported) leadParts.push(`${imported} inserted`);
    if (updated) leadParts.push(`${updated} updated`);
    if (skipped) leadParts.push(`${skipped} skipped`);
    if (leadParts.length) details.push(`Leads: ${leadParts.join(", ")}`);

  }

  if (connector.connector_name === "tally") {

    const records = liveResult?.recordsQueued ?? Number(cfg.recordsQueued ?? 0);

    if (records) details.push(`${records} record(s) queued`);

  }



  return (

    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800/60 pb-3 last:border-0 last:pb-0 text-sm">

      <div>

        <span className="font-medium text-slate-200">{meta.title}</span>

        {syncedAt && (

          <span className="ml-2 text-xs text-slate-500">

            {new Date(syncedAt).toLocaleString()}

          </span>

        )}

        {message && <p className="text-slate-400 text-xs mt-0.5">{message}</p>}

      </div>

      {details.length > 0 && (

        <span className="text-xs text-cyan-400">{details.join(" · ")}</span>

      )}

    </div>

  );

}



function FixStepsBlock({ connector }: { connector: IntegrationRecord }) {

  const steps = connector.config.fixSteps;

  if (!Array.isArray(steps) || !steps.length) return null;



  return (

    <div className="mb-2 rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">

      <p className="font-medium mb-1">How to fix:</p>

      <ol className="list-decimal list-inside space-y-0.5 text-amber-100/90">

        {steps.map((step, i) => (

          <li key={i}>{String(step)}</li>

        ))}

      </ol>

    </div>

  );

}



function SyncedDataPanel({

  syncData,

  connectors,

}: {

  syncData: IntegrationSyncData;

  connectors: IntegrationRecord[];

}) {

  const gsheet = connectors.find((c) => c.connector_name === "gsheet");

  const clickup = connectors.find((c) => c.connector_name === "clickup");

  const tally = connectors.find((c) => c.connector_name === "tally");

  const configTasks = Array.isArray(clickup?.config.tasksPreview)
    ? (clickup!.config.tasksPreview as Array<{ id: string; name: string; status?: string }>)
    : [];
  const clickupDisplayCount = syncData.clickupTaskCount || configTasks.length;



  return (

    <section className="mt-8 space-y-6">

      <h2 className="text-lg font-semibold">Synced Data (visible here)</h2>



      <div className="border border-slate-800 rounded-xl p-5 bg-slate-900/30">

        <div className="flex items-center justify-between mb-3">

          <h3 className="font-medium text-slate-200">

            ClickUp Tasks ({clickupDisplayCount})

          </h3>

          <Link href="/clickup-tasks" className="text-xs text-cyan-400 hover:underline">

            Open /clickup-tasks →

          </Link>

        </div>

        {!syncData.tables.clickup_tasks && syncData.source?.clickup === "tasks_fallback" && (

          <p className="text-xs text-amber-300 mb-2">

            Using <code>tasks</code> table fallback — apply migration 004 for dedicated <code>clickup_tasks</code>

          </p>

        )}

        {clickupDisplayCount === 0 ? (

          <p className="text-xs text-slate-500">No tasks yet — click Sync ClickUp above.</p>

        ) : syncData.clickupTaskCount > 0 ? (

          <div className="overflow-x-auto">

            <table className="w-full text-xs">

              <thead>

                <tr className="text-left text-slate-500 border-b border-slate-800">

                  <th className="py-1 pr-3">Task</th>

                  <th className="py-1 pr-3">Status</th>

                  <th className="py-1 pr-3">List</th>

                  <th className="py-1">Synced</th>

                </tr>

              </thead>

              <tbody>

                {syncData.clickupTasks.slice(0, 10).map((t) => (

                  <tr key={t.id} className="border-b border-slate-800/40">

                    <td className="py-1.5 pr-3 text-slate-300">{t.name}</td>

                    <td className="py-1.5 pr-3 text-slate-400">{t.status || "—"}</td>

                    <td className="py-1.5 pr-3 text-slate-400">{t.list_name || "—"}</td>

                    <td className="py-1.5 text-slate-500">

                      {new Date(t.synced_at).toLocaleString()}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <p className="text-xs text-amber-300 mb-2">

              Live preview from last sync (DB table missing — run npm run db:integrations to persist)

            </p>

            <table className="w-full text-xs">

              <thead>

                <tr className="text-left text-slate-500 border-b border-slate-800">

                  <th className="py-1 pr-3">Task</th>

                  <th className="py-1 pr-3">Status</th>

                </tr>

              </thead>

              <tbody>

                {configTasks.map((t) => (

                  <tr key={t.id} className="border-b border-slate-800/40">

                    <td className="py-1.5 pr-3 text-slate-300">{t.name}</td>

                    <td className="py-1.5 pr-3 text-slate-400">{t.status || "—"}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

        {clickup?.last_sync_at && (

          <p className="text-xs text-slate-500 mt-2">

            Last sync: {new Date(clickup.last_sync_at).toLocaleString()}

          </p>

        )}

      </div>



      <div className="border border-slate-800 rounded-xl p-5 bg-slate-900/30">

        <h3 className="font-medium text-slate-200 mb-3">

          Tally Finance Queue ({syncData.financeRecordCount})

        </h3>

        {!syncData.tables.finance_import_queue && syncData.source.finance === "activity_logs_fallback" && (

          <p className="text-xs text-amber-300 mb-2">

            Using <code>activity_logs</code> fallback — run migration 004 for <code>finance_import_queue</code>

          </p>

        )}

        {syncData.financeRecordCount === 0 ? (

          <p className="text-xs text-slate-500">No records — click Sync Tally above.</p>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-xs">

              <thead>

                <tr className="text-left text-slate-500 border-b border-slate-800">

                  <th className="py-1 pr-3">Company</th>

                  <th className="py-1 pr-3">Type</th>

                  <th className="py-1 pr-3">Description</th>

                  <th className="py-1 pr-3">Amount</th>

                  <th className="py-1">Source</th>

                </tr>

              </thead>

              <tbody>

                {syncData.financeRecords.slice(0, 10).map((r) => (

                  <tr key={r.id} className="border-b border-slate-800/40">

                    <td className="py-1.5 pr-3 text-slate-300">{r.company || "—"}</td>

                    <td className="py-1.5 pr-3 text-slate-400">{r.record_type}</td>

                    <td className="py-1.5 pr-3 text-slate-400">{r.description || "—"}</td>

                    <td className="py-1.5 pr-3 text-slate-400">{r.amount}</td>

                    <td className="py-1.5 text-slate-500">{r.source}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

        {tally?.last_sync_at && (

          <p className="text-xs text-slate-500 mt-2">

            Last sync: {new Date(tally.last_sync_at).toLocaleString()}

            {tally.demo ? " (demo)" : ""}

          </p>

        )}

      </div>



      <div className="border border-slate-800 rounded-xl p-5 bg-slate-900/30">

        <h3 className="font-medium text-slate-200 mb-2">Google Sheets Status</h3>

        {gsheet?.error_message ? (

          <p className="text-xs text-red-400 mb-2">{gsheet.error_message}</p>

        ) : gsheet?.last_sync_at ? (

          <p className="text-xs text-green-400">

            Last sync OK — {new Date(gsheet.last_sync_at).toLocaleString()}

          </p>

        ) : (

          <p className="text-xs text-slate-500">Not synced yet.</p>

        )}

        {gsheet && <FixStepsBlock connector={gsheet} />}

      </div>

    </section>

  );

}



function StatusBadge({ status }: { status: IntegrationDisplayStatus }) {

  const styles: Record<IntegrationDisplayStatus, string> = {

    connected: "border-green-500/40 text-green-400",

    pending: "border-amber-500/40 text-amber-400",

    error: "border-red-500/40 text-red-400",

    demo: "border-cyan-500/40 text-cyan-400",

  };

  const labels: Record<IntegrationDisplayStatus, string> = {

    connected: "Connected",

    pending: "Pending",

    error: "Error",

    demo: "Demo",

  };



  return (

    <span className={`rounded-full border px-3 py-0.5 text-xs ${styles[status]}`}>

      {labels[status]}

    </span>

  );

}


