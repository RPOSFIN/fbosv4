#!/usr/bin/env node
/**
 * P0 closure — run ClickUp + GSheet sync and report row counts.
 * Requires .env.local with Supabase + ClickUp + Google credentials.
 *
 * Usage:
 *   node scripts/run-p0-closure.mjs           # sync via local dev server
 *   node scripts/run-p0-closure.mjs --counts  # counts only, no sync
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const countsOnly = process.argv.includes("--counts");

function loadEnv() {
  const path = join(root, ".env.local");
  try {
    const content = readFileSync(path, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
    return true;
  } catch {
    console.error("ERROR: .env.local not found at", path);
    return false;
  }
}

const TABLES = [
  "leads",
  "jobs",
  "clickup_tasks",
  "finance_import_queue",
  "finance_transactions",
  "integrations",
];

async function countRows(supabase, table) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) return { table, count: null, error: error.message };
  return { table, count: count ?? 0 };
}

async function printCounts(supabase, label) {
  console.log(`\n=== ${label} ===`);
  const out = {};
  for (const t of TABLES) {
    const r = await countRows(supabase, t);
    out[t] = r.count;
    console.log(`${t}: ${r.count ?? "ERR " + r.error}`);
  }
  return out;
}

if (!loadEnv()) process.exit(1);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const supabase = createClient(url, key);
const before = await printCounts(supabase, "BEFORE");

if (countsOnly) process.exit(0);

const base = (process.env.FBOS_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

async function runSync(path, label) {
  console.log(`\n--- ${label} POST ${path} ---`);
  try {
    const res = await fetch(`${base}${path}`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    console.log("HTTP", res.status);
    const data = body?.data ?? body;
    console.log(JSON.stringify(data, null, 2));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error("FAIL:", err instanceof Error ? err.message : err);
    return { ok: false, status: 0, data: null };
  }
}

console.log("\n=== SYNC (dev server must be running: npm run dev) ===");

const clickup = await runSync("/api/integrations/clickup/sync", "ClickUp");
const gsheet = await runSync("/api/integrations/gsheet/sync", "Google Sheets");

const after = await printCounts(supabase, "AFTER");

console.log("\n=== DELTA ===");
for (const t of TABLES) {
  const b = before[t] ?? 0;
  const a = after[t] ?? 0;
  if (a !== null && b !== null) {
    const d = a - b;
    if (d !== 0) console.log(`${t}: ${b} → ${a} (${d >= 0 ? "+" : ""}${d})`);
  }
}

console.log("\n=== SYNC SUMMARY ===");
const cu = clickup.data;
if (cu) {
  console.log(
    "ClickUp:",
    cu.demo ? "demo" : "live",
    "| tasksStored:", cu.tasksStored ?? 0,
    "| leadsImported:", cu.leadsImported ?? 0,
    "| leadsUpdated:", cu.leadsUpdated ?? 0,
    "| leadsSkipped:", cu.leadsSkipped ?? 0
  );
}
const gs = gsheet.data;
if (gs) {
  console.log(
    "GSheet:",
    gs.ok ? "ok" : "fail",
    "| leadsImported:", gs.leadsImported ?? 0,
    "| leadsUpdated:", gs.leadsUpdated ?? 0,
    "| leadsSkipped:", gs.leadsSkipped ?? 0,
    "| operationsImported:", gs.operationsImported ?? 0,
    "| financeImported:", gs.financeImported ?? 0
  );
}
