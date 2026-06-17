#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = join(root, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx);
      const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}
loadEnv();

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DIRECT_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function verifyTables(sb) {
  const tables = ["integrations", "clickup_tasks", "finance_import_queue", "lead_history"];
  const out = {};
  for (const t of tables) {
    const { error } = await sb.from(t).select("*", { head: true, count: "exact" });
    out[t] = error ? { ok: false, msg: error.message } : { ok: true };
  }
  const { error: leadColErr } = await sb.from("leads").select("clickup_task_id").limit(1);
  out.leads_clickup_task_id = leadColErr ? { ok: false, msg: leadColErr.message } : { ok: true };
  const { data, error: intErr } = await sb.from("integrations").select("*").limit(1);
  if (!intErr && data?.[0]) {
    out.integrations_schema = Object.keys(data[0]);
  } else if (intErr) {
    out.integrations_schema = intErr.message;
  }
  return out;
}

const ORDER = [
  "003_integrations.sql",
  "004_integration_tables.sql",
  "005_leads_clickup_dedupe.sql",
  "006_lead_history.sql",
  "007_sheet_hub_extended.sql",
];

async function runPg() {
  if (!dbUrl) return { ok: false, reason: "NO_DATABASE_URL" };
  const pg = await import("pg");
  const client = new pg.default.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const applied = [];
  const failed = [];
  try {
    let sql003 = readFileSync(join(root, "supabase", "migrations", "003_integrations.sql"), "utf8");
    const prelude = "alter table if exists integrations rename to integrations_legacy_phase2;\n";
    sql003 = prelude + sql003;
    const files = [
      { name: "003_integrations.sql", sql: sql003 },
      ...ORDER.slice(1).map((f) => ({
        name: f,
        sql: readFileSync(join(root, "supabase", "migrations", f), "utf8"),
      })),
    ];
    for (const { name, sql } of files) {
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query("commit");
        applied.push(name);
        console.log("APPLIED", name);
      } catch (e) {
        try { await client.query("rollback"); } catch {}
        failed.push({ name, error: e.message });
        console.error("FAILED", name, e.message);
      }
    }
  } finally {
    await client.end();
  }
  return { ok: failed.length === 0, applied, failed };
}

async function tryManagementApi() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token || !url) return { ok: false, reason: "NO_SUPABASE_ACCESS_TOKEN" };
  const ref = new URL(url).hostname.split(".")[0];
  const endpoint = `https://api.supabase.com/v1/projects/${ref}/database/query`;
  const applied = [];
  const failed = [];
  let sql003 = readFileSync(join(root, "supabase", "migrations", "003_integrations.sql"), "utf8");
  sql003 = "alter table if exists integrations rename to integrations_legacy_phase2;\n" + sql003;
  const files = [
    { name: "003_integrations.sql", sql: sql003 },
    ...ORDER.slice(1).map((f) => ({
      name: f,
      sql: readFileSync(join(root, "supabase", "migrations", f), "utf8"),
    })),
  ];
  for (const { name, sql } of files) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: sql }),
    });
    const text = await res.text();
    if (!res.ok) {
      failed.push({ name, error: `${res.status} ${text.slice(0, 200)}` });
      console.error("FAILED", name, res.status);
    } else {
      applied.push(name);
      console.log("APPLIED", name);
    }
  }
  return { ok: failed.length === 0, applied, failed };
}

const sb = createClient(url, key);
console.log("VERIFY_BEFORE", JSON.stringify(await verifyTables(sb), null, 2));

let result = await runPg();
if (!result.ok && result.reason === "NO_DATABASE_URL") {
  console.log("PG_SKIP:", result.reason);
  result = await tryManagementApi();
}

console.log("RUN_RESULT", JSON.stringify(result, null, 2));
console.log("VERIFY_AFTER", JSON.stringify(await verifyTables(sb), null, 2));
process.exit(result.ok ? 0 : 1);
