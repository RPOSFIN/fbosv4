"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";

type MaskedConfig = {
  authDisabled: boolean;
  connectors: {
    gsheet: { configured: boolean; webappUrl: string; csvUrl: string };
    clickup: { configured: boolean; token: string; teamId: string };
    tally: {
      configured: boolean;
      host: string;
      port: string;
      company: string;
    };
  };
};

export default function SettingsPage() {
  const [config, setConfig] = useState<MaskedConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<MaskedConfig>("/api/integrations/config")
      .then(setConfig)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="mt-2 text-slate-400">
            Integration configuration (secrets masked)
          </p>
        </div>
        <Link href="/integrations" className="text-sm text-cyan-400 hover:text-cyan-300">
          Integration Hub →
        </Link>
      </div>

      {loading && <p className="text-slate-500 animate-pulse">Loading…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {config && (
        <div className="space-y-6">
          <section className="border border-slate-800 rounded-xl p-5">
            <h2 className="font-semibold mb-3">Auth</h2>
            <ConfigRow
              label="Auth disabled (local)"
              value={config.authDisabled ? "Yes" : "No"}
            />
          </section>

          <section className="border border-slate-800 rounded-xl p-5">
            <h2 className="font-semibold mb-3">Google Sheets</h2>
            <ConfigRow
              label="Configured"
              value={config.connectors.gsheet.configured ? "Yes" : "No"}
            />
            <ConfigRow label="Webapp URL" value={config.connectors.gsheet.webappUrl} />
            <ConfigRow label="CSV URL" value={config.connectors.gsheet.csvUrl} />
          </section>

          <section className="border border-slate-800 rounded-xl p-5">
            <h2 className="font-semibold mb-3">ClickUp</h2>
            <ConfigRow
              label="Configured"
              value={config.connectors.clickup.configured ? "Yes" : "No (demo mode)"}
            />
            <ConfigRow label="API Token" value={config.connectors.clickup.token} />
            <ConfigRow label="Team ID" value={config.connectors.clickup.teamId} />
            <div className="mt-4 rounded-lg border border-slate-700/60 bg-slate-950/40 p-4 text-xs text-slate-400 space-y-2">
              <p className="font-medium text-slate-300">How to add your ClickUp token</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Open{" "}
                  <code className="text-slate-300">.env.local</code> in the project root
                </li>
                <li>
                  Add: <code className="text-cyan-400">CLICKUP_API_TOKEN=pk_your_token</code>
                </li>
                <li>
                  Optional: <code className="text-cyan-400">CLICKUP_TEAM_ID=your_team_id</code>
                </li>
                <li>Restart the dev server (<code>npm run dev</code>)</li>
                <li>
                  Verify here or sync from{" "}
                  <Link href="/integrations" className="text-cyan-500 hover:underline">
                    Integration Hub
                  </Link>
                </li>
              </ol>
              <p>
                Get token at{" "}
                <a
                  href="https://app.clickup.com/settings/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-500 hover:underline"
                >
                  app.clickup.com/settings/apps
                </a>
              </p>
            </div>
          </section>

          <section className="border border-slate-800 rounded-xl p-5">
            <h2 className="font-semibold mb-3">Tally Cloud</h2>
            <ConfigRow
              label="Configured"
              value={config.connectors.tally.configured ? "Yes" : "No (demo mode)"}
            />
            <ConfigRow label="Cloud Host" value={config.connectors.tally.host} />
            <ConfigRow label="Gateway Port" value={config.connectors.tally.port} />
            <ConfigRow label="Company" value={config.connectors.tally.company} />
            <div className="mt-4 rounded-lg border border-amber-800/40 bg-amber-950/20 p-4 text-xs text-amber-200 space-y-2">
              <p className="font-medium text-amber-100">Tally on Cloud (not localhost)</p>
              <p>
                Set <code className="text-amber-100">TALLY_HOST=your-cloud-server-ip-or-hostname</code> in{" "}
                <code>.env.local</code> — not localhost. Port defaults to 9007 via{" "}
                <code>TALLY_PORT</code>.
              </p>
              <p>
                Or save host in{" "}
                <Link href="/integrations" className="text-cyan-400 hover:underline">
                  Integration Hub → Tally card
                </Link>
                .
              </p>
            </div>
          </section>

          <p className="text-xs text-slate-500">
            Edit <code>.env.local</code> to change values. See{" "}
            <code>.env.local.example</code> for variable names.
          </p>
        </div>
      )}
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-slate-800/60 last:border-0 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-slate-200 text-right">{value}</span>
    </div>
  );
}
