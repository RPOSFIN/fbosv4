/**
 * UI trace — mirrors app/sales-workbench/page.tsx client flow (no backend changes).
 */
import { readFileSync } from "node:fs";

const BASE = process.env.TRACE_BASE || "http://localhost:3000";

async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json.data;
}

function unwrapLeadsPage(payload) {
  if (Array.isArray(payload)) {
    return { leads: payload, total: payload.length };
  }
  if (payload && typeof payload === "object") {
    const inner = payload.data ?? payload;
    const leads = inner.leads ?? [];
    return { leads, total: inner.total ?? leads.length };
  }
  return { leads: [], total: 0 };
}

function topSourcesFromBreakdown(sourceBreakdown) {
  if (!sourceBreakdown) return [];
  return Object.entries(sourceBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
}

function normalizeLeadStats(payload) {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload.data ?? payload;
  const total = raw.total ?? 0;
  const unique = raw.unique ?? total;
  const won = raw.won ?? 0;
  const lost = raw.lost ?? 0;
  const topSources =
    raw.topSources?.length ? raw.topSources : topSourcesFromBreakdown(raw.sourceBreakdown);
  return {
    total,
    unique,
    duplicates: raw.duplicates ?? Math.max(0, total - unique),
    won,
    lost,
    active: raw.active ?? Math.max(0, total - won - lost),
    statusBreakdown: raw.statusBreakdown ?? {},
    topSources,
    recentLeads: raw.recentLeads ?? [],
  };
}

console.log("WORKBENCH MOUNTED (trace script)");

try {
  const [leadsResponse, statsResponse] = await Promise.all([
    apiFetch("/api/leads?limit=50"),
    apiFetch("/api/leads/stats"),
  ]);

  console.log("LEADS RESPONSE", JSON.stringify(leadsResponse).slice(0, 400));
  console.log("STATS RESPONSE", JSON.stringify(statsResponse).slice(0, 400));

  const page = unwrapLeadsPage(leadsResponse);
  const parsedStats = normalizeLeadStats(statsResponse);
  const rows = page.leads.slice(0, 20);
  const kpi = {
    total: parsedStats?.total ?? 0,
    won: parsedStats?.won ?? 0,
    active: parsedStats?.active ?? 0,
    lost: parsedStats?.lost ?? 0,
  };

  console.log("SETTING KPI", kpi);
  console.log("SETTING LEADS", rows.length);

  if (kpi.total === 0) {
    console.log("KPI ZERO CAUSE: parsedStats=", parsedStats, "statsResponse keys=", statsResponse && Object.keys(statsResponse));
  }
  if (rows.length === 0) {
    console.log("LEADS EMPTY CAUSE: unwrapLeadsPage=", page, "leadsResponse type=", Array.isArray(leadsResponse) ? "array" : typeof leadsResponse);
  }
} catch (e) {
  console.log("WORKBENCH FETCH ERROR", e.message);
  console.log("SETTING KPI", { total: 0, won: 0, active: 0, lost: 0 });
  console.log("SETTING LEADS", 0);
}
