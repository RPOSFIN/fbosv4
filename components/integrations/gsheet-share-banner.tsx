"use client";

import type { IntegrationRecord } from "@/lib/integrations/types";

const SHEET_ID = "1Pi6Mz7P5oYkLutsWLrM8aoos4ijXtmEuessFvd4oUBI";
const LEAD_CRM_GID = "339902754";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${LEAD_CRM_GID}`;

function isGSheetPrivateError(connector: IntegrationRecord | undefined): boolean {
  if (!connector || connector.connector_name !== "gsheet") return false;
  if (connector.status === "error") return true;
  const msg = `${connector.error_message || ""} ${connector.config.lastMessage || ""}`.toLowerCase();
  return (
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("private") ||
    msg.includes("csv fetch failed")
  );
}

export function GSheetShareBanner({
  connectors,
}: {
  connectors: IntegrationRecord[] | undefined;
}) {
  const gsheet = connectors?.find((c) => c.connector_name === "gsheet");
  if (!isGSheetPrivateError(gsheet)) return null;

  return (
    <div className="mb-6 rounded-xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-950/40 to-slate-950/60 p-5 shadow-lg">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-2xl">
          🔒
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-amber-200">
            Google Sheet sync blocked — check sharing + correct tab
          </h2>
          <p className="mt-1 text-sm text-amber-100/80">
            Viewer sharing is enough for sync (gviz CSV). The old <code>/export?format=csv</code> URL
            needs <strong>Publish to web</strong>. Also set <strong>07_Lead_CRM</strong> tab
            (gid=339902754), not Dashboard (gid=0). Phir <strong>Sync Now</strong> dabayein.
          </p>

          <ol className="mt-4 space-y-3 text-sm">
            <li className="flex gap-3 rounded-lg border border-amber-800/40 bg-slate-900/50 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                1
              </span>
              <div>
                <p className="font-medium text-amber-100">
                  Sheet link kholo (nayi tab mein)
                </p>
                <a
                  href={SHEET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block break-all text-cyan-400 underline hover:text-cyan-300"
                >
                  {SHEET_URL}
                </a>
              </div>
            </li>

            <li className="flex gap-3 rounded-lg border border-amber-800/40 bg-slate-900/50 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                2
              </span>
              <div>
                <p className="font-medium text-amber-100">
                  Upar-right corner mein <strong>Share</strong> (शेयर) button par click karo
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  📸 Screenshot jaisa: green button &quot;Share&quot; — sheet ke title ke bagal mein
                </p>
              </div>
            </li>

            <li className="flex gap-3 rounded-lg border border-amber-800/40 bg-slate-900/50 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                3
              </span>
              <div>
                <p className="font-medium text-amber-100">
                  &quot;General access&quot; → <strong>Anyone with the link</strong> select karo
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Role: <strong>Viewer</strong> (dekh sakte hain, edit nahi) — yahi safe option hai
                </p>
              </div>
            </li>

            <li className="flex gap-3 rounded-lg border border-amber-800/40 bg-slate-900/50 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                4
              </span>
              <div>
                <p className="font-medium text-amber-100">
                  Open tab <strong>07_Lead_CRM</strong> (not 01_Dashboard) — gid=339902754
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  .env.local: GOOGLE_SHEET_GID=339902754
                </p>
              </div>
            </li>

            <li className="flex gap-3 rounded-lg border border-amber-800/40 bg-slate-900/50 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                5
              </span>
              <div>
                <p className="font-medium text-amber-100">
                  <strong>Done</strong> → wapas aa kar Sync Now
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Still failing? File → Share → Publish to web → CSV (for /export URL only)
                </p>
              </div>
            </li>
          </ol>

          <p className="mt-4 text-xs text-red-300/90">
            {gsheet?.error_message ||
              "Sync failed — verify Viewer sharing + Lead CRM tab gid, then Sync Now."}
          </p>

          <details className="mt-3 text-xs text-slate-400">
            <summary className="cursor-pointer text-amber-200/90 hover:text-amber-100">
              Alternative: Publish to web (CSV link) | विकल्प: Publish to web
            </summary>
            <ol className="mt-2 list-decimal list-inside space-y-1 pl-1">
              <li>File → Share → Publish to web → choose tab (gid=0) → Publish</li>
              <li>
                CSV URL format:{" "}
                <code className="text-cyan-400 break-all">
                  https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&amp;gid=0
                </code>
              </li>
              <li>
                Or set <code>GOOGLE_WEBAPP_URL</code> from Apps Script deployment (Extensions →
                Apps Script → Deploy → Web app, Anyone access)
              </li>
            </ol>
          </details>
        </div>
      </div>
    </div>
  );
}
