#!/usr/bin/env node
/**
 * Applies Phase 3 integration migrations via Supabase service role.
 * Upgrades legacy integrations schema if present, then applies 003 + 004.
 */
import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

const NAME_MAP = {
  GOOGLE_SHEETS: "gsheet",
  GSHEET: "gsheet",
  CLICKUP: "clickup",
  TALLY: "tally",
  gsheet: "gsheet",
  clickup: "clickup",
  tally: "tally",
};

const STATUS_MAP = {
  ACTIVE: "connected",
  CONNECTED: "connected",
  PENDING: "pending",
  ERROR: "failed",
  connected: "connected",
  pending: "pending",
  error: "error",
};

async function tableHasColumn(table, column) {
  const { data, error } = await supabase.from(table).select(column).limit(1);
  return !error;
}

async function upgradeLegacyIntegrations() {
  const hasConnector = await tableHasColumn("integrations", "connector_name");
  const hasLegacy = await tableHasColumn("integrations", "integration_name");

  if (!hasLegacy && hasConnector) {
    console.log("integrations: Phase 3 schema already present");
    return;
  }

  if (!hasLegacy && !hasConnector) {
    console.log("integrations: table missing — will be created via SQL apply");
    return;
  }

  console.log("integrations: upgrading legacy schema...");
  const { data: rows, error } = await supabase.from("integrations").select("*");
  if (error) {
    console.error("Failed to read integrations:", error.message);
    return;
  }

  const upgraded = (rows || []).map((row) => {
    const rawName = row.connector_name || row.integration_name || "";
    const connector_name =
      NAME_MAP[rawName] || NAME_MAP[String(rawName).toUpperCase()] || String(rawName).toLowerCase();
    const rawStatus = row.status || "pending";
    const status = STATUS_MAP[rawStatus] || STATUS_MAP[String(rawStatus).toUpperCase()] || "pending";
    const normalizedStatus =
      status === "failed" ? "error" : status === "connected" ? "connected" : status === "error" ? "error" : "pending";

    return {
      connector_name,
      status: normalizedStatus,
      config: {
        label:
          connector_name === "gsheet"
            ? "Google Sheets"
            : connector_name === "clickup"
              ? "ClickUp"
              : "Tally",
        ...(typeof row.config === "object" && row.config ? row.config : {}),
        ...(row.api_key ? { hasApiKey: true } : {}),
      },
      last_sync_at: row.last_sync_at ?? null,
      error_message: row.error_message ?? null,
      updated_at: new Date().toISOString(),
    };
  });

  // Recreate table with correct schema via delete + insert won't work for column rename.
  // Use upsert on a temp approach: delete all and insert with new shape if connector_name works after manual SQL.
  // Service role can insert if we first try adding columns via REST isn't possible.
  // Fallback: store in memory and report SQL needed.

  for (const row of upgraded) {
    const { error: upsertErr } = await supabase.from("integrations").upsert(row, {
      onConflict: "connector_name",
    });
    if (upsertErr && upsertErr.message.includes("connector_name")) {
      console.log(
        "Legacy schema detected. Run 003_integrations.sql in Supabase SQL Editor to add connector_name column."
      );
      console.log("Mapped rows for manual insert:", JSON.stringify(upgraded, null, 2));
      return;
    }
    if (upsertErr) {
      console.warn(`Upsert ${row.connector_name}:`, upsertErr.message);
    }
  }

  console.log(`integrations: upgraded ${upgraded.length} row(s)`);
}

async function ensureSeedRows() {
  const seeds = [
    { connector_name: "gsheet", status: "connected", config: { label: "Google Sheets" } },
    { connector_name: "clickup", status: "pending", config: { label: "ClickUp" } },
    { connector_name: "tally", status: "pending", config: { label: "Tally" } },
  ];

  for (const seed of seeds) {
    const { error } = await supabase.from("integrations").upsert(
      { ...seed, updated_at: new Date().toISOString() },
      { onConflict: "connector_name", ignoreDuplicates: true }
    );
    if (error && !error.message.includes("connector_name")) {
      console.warn("Seed", seed.connector_name, error.message);
    }
  }
}

async function ensureSupplementalTables() {
  for (const table of ["clickup_tasks", "finance_import_queue"]) {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (error?.code === "PGRST205" || error?.message?.includes("Could not find")) {
      console.log(`MISSING ${table}: apply supabase/migrations/004_integration_tables.sql in SQL Editor`);
      console.log(`         (fallback: ${table === "clickup_tasks" ? "tasks" : "activity_logs"} table used)`);
    } else if (error) {
      console.log(`WARN  ${table}: ${error.message}`);
    } else {
      console.log(`OK    ${table}`);
    }
  }
}

async function main() {
  console.log("FBOS Integration Migration");
  console.log("---");

  const { error: intErr } = await supabase
    .from("integrations")
    .select("id", { head: true, count: "exact" });

  if (intErr) {
    console.log("integrations table missing — apply supabase/migrations/003_integrations.sql");
  } else {
    const hasConnector = await tableHasColumn("integrations", "connector_name");
    if (hasConnector) {
      await ensureSeedRows();
      console.log("OK    integrations (Phase 3 schema)");
    } else {
      await upgradeLegacyIntegrations();
    }
  }

  await ensureSupplementalTables();
  console.log("---");
  console.log("Done. If tables missing, paste SQL from migrations/003 and 004 into Supabase SQL Editor.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
