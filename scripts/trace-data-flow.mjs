#!/usr/bin/env node
/**
 * Trace Google Sheet tabs + Supabase row counts.
 * Usage: node scripts/trace-data-flow.mjs
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const path = join(root, ".env.local");
  if (!existsSync(path)) {
    console.error("ERROR: .env.local not found");
    process.exit(1);
  }
  for (const line of readFileSync(path, "utf8").split("\n")) {
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
}

function parseCsvLine(line) {
  const cols = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else inQuotes = false;
      } else current += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      cols.push(current.trim());
      current = "";
    } else current += ch;
  }
  cols.push(current.trim());
  return cols;
}

async function fetchTabRows(sheetId, gid) {
  if (!sheetId || !gid) return { rows: [], headers: [] };
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  if (!res.ok || text.includes("accounts.google.com/ServiceLogin")) {
    return { rows: [], headers: [], error: `HTTP ${res.status} or login wall` };
  }
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { rows: [], headers: parseCsvLine(lines[0] || "") };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const raw = {};
    headers.forEach((h, i) => {
      raw[h] = cols[i] || "";
    });
    return raw;
  });
  return { rows, headers };
}

function countJobCandidates(rows) {
  let withOrderId = 0;
  for (const raw of rows) {
    const keys = Object.keys(raw).map((k) =>
      k.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
    );
    const vals = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [
        k.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
        String(v || "").trim(),
      ])
    );
    const jobNo =
      vals.job_no ||
      vals.job_number ||
      vals.order_id ||
      vals.order_no ||
      vals.orderid ||
      "";
    if (jobNo) withOrderId++;
  }
  return { total: rows.length, withJobKey: withOrderId };
}

loadEnv();

const sheetId =
  process.env.GOOGLE_SHEET_ID ||
  process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID ||
  "";
const tabs = {
  leads: process.env.GOOGLE_SHEET_GID_LEADS || process.env.GOOGLE_SHEET_GID || "",
  operations:
    process.env.GOOGLE_SHEET_GID_OPERATIONS ||
    process.env.GOOGLE_SHEET_GID_JOBS ||
    "",
  jobs:
    process.env.GOOGLE_SHEET_GID_JOBS ||
    process.env.GOOGLE_SHEET_GID_OPERATIONS ||
    "",
  finance: process.env.GOOGLE_SHEET_GID_FINANCE || process.env.GOOGLE_SHEET_GID || "",
  clients: process.env.GOOGLE_SHEET_GID_CLIENTS || "",
  followups: process.env.GOOGLE_SHEET_GID_FOLLOWUPS || "",
};

console.log("=== ENV TAB GIDs ===");
console.log(JSON.stringify(tabs, null, 2));
console.log("GOOGLE_SHEET_ID:", sheetId || "(not set)");
console.log("GOOGLE_WEBAPP_URL:", process.env.GOOGLE_WEBAPP_URL ? "set" : "not set");
console.log("CLICKUP_API_TOKEN:", process.env.CLICKUP_API_TOKEN ? "set" : "not set");
console.log("CLICKUP_LIST_ID:", process.env.CLICKUP_LIST_ID || "(not set)");

console.log("\n=== SHEET TAB ROW COUNTS ===");
for (const [name, gid] of Object.entries(tabs)) {
  if (!gid) {
    console.log(`${name}: SKIP (no GID)`);
    continue;
  }
  const { rows, headers, error } = await fetchTabRows(sheetId, gid);
  const line = `${name} (gid=${gid}): ${rows.length} data rows`;
  if (error) console.log(line, "—", error);
  else {
    console.log(line, headers.length ? `— headers: ${headers.slice(0, 6).join(", ")}...` : "");
    if (name === "operations" || name === "jobs") {
      const jc = countJobCandidates(rows);
      console.log(`  job key candidates: ${jc.withJobKey}/${jc.total}`);
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("\nSupabase env missing — skip DB counts");
  process.exit(0);
}

const supabase = createClient(url, key);
const tables = [
  "leads",
  "jobs",
  "clickup_tasks",
  "finance_import_queue",
  "finance_transactions",
];

console.log("\n=== SUPABASE COUNTS ===");
for (const t of tables) {
  const { count, error } = await supabase
    .from(t)
    .select("*", { count: "exact", head: true });
  console.log(`${t}: ${error ? "ERR " + error.message : count ?? 0}`);
}

const { count: clickupLeads } = await supabase
  .from("leads")
  .select("*", { count: "exact", head: true })
  .eq("source", "ClickUp");
const { count: withTaskId } = await supabase
  .from("leads")
  .select("*", { count: "exact", head: true })
  .not("clickup_task_id", "is", null);

console.log(`leads (source=ClickUp): ${clickupLeads ?? 0}`);
console.log(`leads (clickup_task_id set): ${withTaskId ?? 0}`);
