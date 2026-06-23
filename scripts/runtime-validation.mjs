#!/usr/bin/env node
/**
 * FBOS runtime validation — fails on any API error or lead count mismatch.
 *
 * Usage:
 *   node scripts/runtime-validation.mjs
 *   BASE_URL=http://localhost:3001 node scripts/runtime-validation.mjs
 */

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

const ENDPOINTS = [
  { path: "/api/leads", name: "leads-list" },
  { path: "/api/leads?limit=50", name: "leads-paginated" },
  { path: "/api/leads/stats", name: "leads-stats" },
  { path: "/api/dashboard/command-center", name: "dashboard-command-center" },
  { path: "/api/dashboard/kpi", name: "dashboard-kpi" },
  { path: "/api/finance/matrix", name: "finance-matrix" },
];

async function fetchJson(path) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { url, status: res.status, body, ok: res.ok };
}

function countFromLeads(body) {
  const data = body?.data;
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === "object") {
    if (typeof data.total === "number") return data.total;
    if (Array.isArray(data.leads)) return data.leads.length;
  }
  return null;
}

async function main() {
  console.log(`FBOS Runtime Validation — ${BASE_URL}\n`);
  const results = [];
  let fail = false;

  for (const endpoint of ENDPOINTS) {
    const result = await fetchJson(endpoint.path);
    const pass = result.ok && result.body?.data !== undefined && !result.body?.error;
    results.push({ ...endpoint, ...result, pass });
    if (!pass) fail = true;
    console.log(`${pass ? "PASS" : "FAIL"} ${endpoint.path} (HTTP ${result.status})`);
    if (!pass) {
      console.log(`  error: ${result.body?.error || JSON.stringify(result.body)?.slice(0, 200)}`);
    }
  }

  const stats = results.find((r) => r.name === "leads-stats");
  const paginated = results.find((r) => r.name === "leads-paginated");
  const command = results.find((r) => r.name === "dashboard-command-center");
  const kpi = results.find((r) => r.name === "dashboard-kpi");

  const statsTotal = stats?.body?.data?.total;
  const paginatedTotal = paginated?.body?.data?.total;
  const commandTotal = command?.body?.data?.sales?.totalLeads;
  const kpiTotal = kpi?.body?.data?.leads;
  const statsWon = stats?.body?.data?.won;
  const commandWon = command?.body?.data?.sales?.won;

  console.log("\nLead count consistency:");
  console.log(`  /api/leads/stats total:              ${statsTotal}`);
  console.log(`  /api/leads?limit=50 total:           ${paginatedTotal}`);
  console.log(`  /api/dashboard/command-center total: ${commandTotal}`);
  console.log(`  /api/dashboard/kpi leads:            ${kpiTotal}`);
  console.log(`  won (stats / command-center):        ${statsWon} / ${commandWon}`);

  const counts = [statsTotal, paginatedTotal, commandTotal, kpiTotal].filter(
    (n) => typeof n === "number"
  );
  const uniqueCounts = new Set(counts);
  if (uniqueCounts.size > 1) {
    fail = true;
    console.log("\nFAIL — lead counts do not match across endpoints");
  } else if (counts.length >= 2) {
    console.log("\nPASS — lead counts consistent");
  }

  if (typeof statsWon === "number" && typeof commandWon === "number" && statsWon !== commandWon) {
    fail = true;
    console.log("FAIL — won counts do not match");
  }

  const arrayCount = countFromLeads(results.find((r) => r.name === "leads-list")?.body);
  if (typeof arrayCount === "number" && typeof statsTotal === "number" && arrayCount !== statsTotal) {
    fail = true;
    console.log(`FAIL — /api/leads array count (${arrayCount}) != stats total (${statsTotal})`);
  }

  console.log(`\n${fail ? "FAIL" : "PASS"} — runtime validation`);
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error("FAIL — runtime validation crashed:", err.message);
  process.exit(1);
});
