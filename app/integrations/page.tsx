"use client";

import { useEffect, useState } from "react";
import CommandHeader from "@/components/command-center/command-header";
import { pageShell, panelPad, subheading, muted, body } from "@/components/command-center/theme";
import EngineeringPanel from "@/components/engineering/engineering-panel";

interface ConnectorStatus {
  name: string;
  label: string;
  status: string;
  lastSyncAt?: string | null;
  demo?: boolean;
  errorMessage?: string | null;
}

function isReallyConnected(c: ConnectorStatus): boolean {
  if (c.status !== "connected") return false;
  if (c.demo) return false;
  return true;
}

export default function IntegrationsPage() {
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState("integrations_status_only");

  async function loadData() {
    try {
      setLoading(true);
      const healthRes = await fetch("/api/integrations/health").catch(() => null);

      if (healthRes?.ok) {
        const healthJson = await healthRes.json();
        const connectorMap = healthJson?.connectors ?? {};
        setSource(healthJson?.source ?? "integrations_status_only");
        setConnectors(
          Object.entries(connectorMap).map(([name, info]: [string, any]) => ({
            name,
            label: info?.label ?? name,
            status: info?.status ?? "unknown",
            lastSyncAt: info?.lastSyncAt ?? null,
            demo: info?.demo,
            errorMessage: info?.errorMessage ?? null,
          }))
        );
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (value: string | null | undefined): string => {
    if (!value) return "—";
    try {
      return new Date(value as string).toLocaleString("en-IN");
    } catch {
      return "—";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <CommandHeader title="Integrations" />
        <div className={`${pageShell} space-y-5`}>
          <section>
            <EngineeringPanel />
          </section>
          <p className={muted}>Loading integration status…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <CommandHeader title="Integrations" badge="CONNECTOR HEALTH ONLY" />
      <div className={`${pageShell} space-y-5`}>
        <p className={body}>
          Source: <span className="font-semibold text-slate-900">{source}</span>
        </p>

        {error && (
          <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-red-800 text-[15px]">
            Error: {error}
          </div>
        )}

        <section>
          <EngineeringPanel />
        </section>

        <section>
          <h2 className={subheading}>Connectors</h2>
          {connectors.length === 0 ? (
            <div className={`${panelPad} mt-3 text-slate-500`}>No connectors registered.</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              {connectors.map((c) => {
                const ok = isReallyConnected(c);
                return (
                  <div
                    key={c.name}
                    className={`${panelPad} ${ok ? "border-emerald-300 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-900 text-[15px]">{c.label}</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                        }`}
                      >
                        {ok ? "Connected" : "Fail"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{c.name}</p>
                    <p className="text-xs text-slate-500 mt-1">Last sync: {formatDate(c.lastSyncAt)}</p>
                    {c.demo && <p className="text-xs text-amber-700 mt-1">Demo data is not considered connected.</p>}
                    {c.errorMessage && <p className="text-xs text-red-700 mt-1">{c.errorMessage}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className={`${panelPad} text-slate-600 text-[15px]`}>
            Sales, ClickUp tasks, FinanceOS/Tally records, and call coaching data are intentionally not shown here.
            Use their owning modules so integrations remains connector-health only.
          </div>
        </section>
      </div>
    </div>
  );
}
