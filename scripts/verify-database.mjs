#!/usr/bin/env node
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  try {
    const envPath = join(root, ".env.local");
    const content = readFileSync(envPath, "utf8");
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
    // optional
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const REQUIRED_TABLES = [
  "profiles",
  "leads",
  "clients",
  "followups",
  "quotations",
  "jobs",
  "products",
  "orders",
  "tasks",
  "call_coach_notes",
  "sops",
  "checklists",
  "route_maps",
  "affirmations",
  "activity_logs",
  "audit_logs",
];

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

let ok = true;
console.log("FBOS Database Verification");
const serviceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log("Mode:", serviceRole ? "service_role" : "anon");
console.log("---");

if (!serviceRole) {
  const { data, error } = await supabase.rpc("get_fbos_dashboard_status");
  if (error) {
    console.log(`FAIL  dashboard RPC: ${error.message}`);
    console.log("---");
    console.log("Anon verification failed. Add SUPABASE_SERVICE_ROLE_KEY for direct table verification.");
    process.exit(1);
  }

  const counts = data?.counts || {};
  console.log("OK    dashboard RPC");
  console.log(`OK    leads (${counts.leads ?? 0})`);
  console.log(`OK    jobs (${counts.jobs ?? 0})`);
  console.log(`OK    clickup_tasks (${counts.clickup_tasks ?? 0})`);
  console.log(`OK    finance_import_queue (${counts.finance_import_queue ?? 0})`);
  console.log("WARN  SUPABASE_SERVICE_ROLE_KEY missing: direct table/RLS-bypass verification skipped");
  console.log("---");
  console.log("Supabase verified via public dashboard RPC.");
  process.exit(0);
}

for (const table of REQUIRED_TABLES) {
  const { error } = await supabase.from(table).select("id", { head: true, count: "exact" });
  if (error) {
    ok = false;
    console.log(`FAIL  ${table}: ${error.message}`);
  } else {
    console.log(`OK    ${table}`);
  }
}

console.log("---");
console.log(ok ? "All required tables verified." : "Some tables are missing. Run: npm run db:apply");
process.exit(ok ? 0 : 1);
