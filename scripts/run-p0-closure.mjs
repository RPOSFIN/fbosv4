#!/usr/bin/env node
/**
 * P0 closure — run ClickUp + GSheet sync and report row counts.
 * Requires .env.local with Supabase + ClickUp + Google credentials.
 *
 * Usage:
 *   node scripts/run-p0-closure.mjs              # sync via local dev server
 *   node scripts/run-p0-closure.mjs --counts     # counts only, no sync
 *   node scripts/run-p0-closure.mjs --direct     # sync in-process (no dev server)
 *
 * Env:
 *   FBOS_BASE_URL  — override base URL (default: auto-detect localhost:3000-3002)
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const countsOnly = process.argv.includes("--counts");
const directSync = process.argv.includes("--direct");

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

async function resolveBaseUrl() {
  if (process.env.FBOS_BASE_URL?.trim()) {
    return process.env.FBOS_BASE_URL.trim().replace(/\/$/, "");
  }

  const ports = [3000, 3001, 3002, 3099];
  for (const port of ports) {
    const base = `http://127.0.0.1:${port}`;
    try {
      const res = await fetch(`${base}/api/health/database`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        console.log(`Detected dev server at ${base}`);
        return base;
      }
    } catch {
      // try next port
    }
  }

  return "http://localhost:3000";
}

async function runSync(base, path, label) {
  console.log(`\n--- ${label} POST ${path} ---`);
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json().catch(() => ({}));
    console.log("HTTP", res.status);
    const data = body?.data ?? body;
    console.log(JSON.stringify(data, null, 2));
    if (!res.ok) {
      console.error(`WARN: ${label} returned HTTP ${res.status}`);
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error("FAIL:", err instanceof Error ? err.message : err);
    return { ok: false, status: 0, data: null };
  }
}

function runDirectSync() {
  console.log("\n=== DIRECT SYNC (in-process, no dev server) ===");
  const tsxBin = join(root, "node_modules", ".bin", "tsx");
  const script = join(root, "scripts", "p0-sync-direct.ts");
  const useLocal = existsSync(tsxBin);
  const result = spawnSync(
    useLocal ? tsxBin : "npx",
    useLocal ? [script] : ["tsx", script],
    { cwd: root, stdio: "inherit", env: process.env, shell: !useLocal }
  );
  if (result.status !== 0) {
    console.error(
      "Direct sync failed. Run: npm install (tsx devDependency required)"
    );
    process.exit(result.status ?? 1);
  }
  return { clickup: { data: {} }, gsheet: { data: {} } };
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

let clickup = { ok: false, data: null };
let gsheet = { ok: false, data: null };

if (directSync) {
  runDirectSync();
} else {
  const base = await resolveBaseUrl();
  console.log(`\n=== SYNC via ${base} (POST endpoints) ===`);

  clickup = await runSync(base, "/api/integrations/clickup/sync", "ClickUp");
  gsheet = await runSync(base, "/api/integrations/gsheet/sync", "Google Sheets");

  if (!clickup.ok && !gsheet.ok) {
    console.error(
      "\nBoth syncs failed via HTTP. Retry with:\n  npm run p0:sync -- --direct"
    );
  }
}

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

if (!directSync) {
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
}
