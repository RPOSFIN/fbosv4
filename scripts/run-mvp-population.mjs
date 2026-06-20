#!/usr/bin/env node
/**
 * MVP data population — runs sync-all using .env.local credentials.
 * Usage: node scripts/run-mvp-population.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  try {
    const content = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx);
      const value = trimmed.slice(idx + 1);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    console.error("Missing .env.local — copy from .env.example");
    process.exit(1);
  }
}

async function countRows(supabase, table) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) return { table, count: null, error: error.message };
  return { table, count: count ?? 0 };
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);
const tables = [
  "jobs",
  "finance_import_queue",
  "clickup_tasks",
  "leads",
  "integrations",
];

console.log("=== BEFORE ===");
const before = {};
for (const t of tables) {
  const r = await countRows(supabase, t);
  before[t] = r.count;
  console.log(`${t}: ${r.count ?? "ERR " + r.error}`);
}

const base = process.env.FBOS_BASE_URL || "http://localhost:3000";
console.log(`\n=== SYNC via ${base}/api/integrations/sync-all ===`);

const res = await fetch(`${base}/api/integrations/sync-all`, { method: "POST" });
const body = await res.json().catch(() => ({}));
console.log("HTTP", res.status);
console.log(JSON.stringify(body?.data?.results ?? body, null, 2));

console.log("\n=== AFTER ===");
const after = {};
for (const t of tables) {
  const r = await countRows(supabase, t);
  after[t] = r.count;
  const delta = (r.count ?? 0) - (before[t] ?? 0);
  console.log(`${t}: ${r.count ?? "ERR"} (${delta >= 0 ? "+" : ""}${delta})`);
}
