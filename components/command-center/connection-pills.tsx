"use client";

import { useEffect, useState } from "react";

type Connector = {
  name: string;
  label: string;
  status: string;
};

const PILL_STYLES: Record<string, string> = {
  connected: "bg-emerald-100 text-emerald-800 border-emerald-300",
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  error: "bg-red-100 text-red-800 border-red-300",
  demo: "bg-sky-100 text-sky-800 border-sky-300",
  bypass: "bg-slate-100 text-slate-600 border-slate-300",
  unknown: "bg-slate-100 text-slate-600 border-slate-300",
};

const DOT_STYLES: Record<string, string> = {
  connected: "bg-emerald-500",
  pending: "bg-amber-500",
  error: "bg-red-500",
  demo: "bg-sky-500",
  bypass: "bg-slate-400",
  unknown: "bg-slate-400",
};

export default function ConnectionPills() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [supabaseOk, setSupabaseOk] = useState(true);

  useEffect(() => {
    fetch("/api/integrations/health")
      .then((r) => r.json())
      .then((json) => {
        const map = json?.connectors ?? {};
        setConnectors(
          Object.entries(map).map(([name, info]: [string, any]) => ({
            name,
            label: info?.label ?? name,
            status: info?.status ?? "unknown",
          }))
        );
        setSupabaseOk(json?.source === "supabase" || Boolean(json?.tables?.integrations));
      })
      .catch(() => setSupabaseOk(false));
  }, []);

  const pills = [
    ...connectors.filter((c) => ["gsheet", "tally", "clickup"].includes(c.name)),
    {
      name: "supabase",
      label: "Supabase",
      status: supabaseOk ? "connected" : "error",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pills.map((c) => (
        <span
          key={c.name}
          title={`${c.label}: ${c.status}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${PILL_STYLES[c.status] || PILL_STYLES.unknown}`}
        >
          <span
            className={`w-2 h-2 rounded-full ${DOT_STYLES[c.status] || DOT_STYLES.unknown}`}
          />
          {c.name === "gsheet" ? "GSheet" : c.name === "clickup" ? "ClickUp" : c.label}
        </span>
      ))}
    </div>
  );
}
