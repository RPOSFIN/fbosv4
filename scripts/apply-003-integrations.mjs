#!/usr/bin/env node
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

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

const migrationPath = join(root, "supabase", "migrations", "003_integrations.sql");
let sql = readFileSync(migrationPath, "utf8");
const prelude = "alter table if exists integrations rename to integrations_legacy_phase2;\n";
sql = prelude + sql;

async function runWithPg() {
  if (!dbUrl) {
    console.error("NO_DATABASE_URL");
    return false;
  }
  const pg = await import("pg");
  const client = new pg.default.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log("MIGRATION_OK");
    return true;
  } catch (e) {
    try { await client.query("rollback"); } catch {}
    console.error("MIGRATION_FAIL:", e.message);
    return false;
  } finally {
    await client.end();
  }
}

async function verify() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sb = createClient(url, key);
  const { error } = await sb.from("integrations").select("connector_name", { head: true, count: "exact" });
  if (error) {
    console.log("VERIFY_FAIL:", error.code, error.message);
    return false;
  }
  console.log("VERIFY_OK");
  return true;
}

const ok = (await verify()) || ((await runWithPg()) && (await verify()));
process.exit(ok ? 0 : 1);
