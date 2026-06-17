#!/usr/bin/env node
/**
 * Finance hub setup — updates .env.local, verifies Supabase, probes Google Sheet.
 * Google tab create: run initializeFinanceSheet once in Apps Script (browser login required).
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");

function loadEnv() {
  if (!existsSync(envPath)) return {};
  const map = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    map[t.slice(0, i)] = t.slice(i + 1);
  }
  return map;
}

function upsertEnv(updates) {
  let lines = existsSync(envPath) ? readFileSync(envPath, "utf8").split("\n") : [];
  const keys = new Set(Object.keys(updates));
  lines = lines.filter((line) => {
    const k = line.split("=")[0]?.trim();
    return !keys.has(k);
  });
  for (const [k, v] of Object.entries(updates)) {
    lines.push(`${k}=${v}`);
  }
  writeFileSync(envPath, lines.join("\n").replace(/\n+$/, "\n") + "\n", "utf8");
}

async function probeCsv(sheetId, gid) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  if (!res.ok || text.includes("accounts.google.com/ServiceLogin")) {
    return { ok: false, reason: "login_or_private" };
  }
  const firstLine = text.split("\n")[0] || "";
  return { ok: true, headers: firstLine.slice(0, 120) };
}

async function main() {
  const env = loadEnv();
  const sheetId = env.GOOGLE_SHEET_ID || "1Pi6Mz7P5oYkLutsWLrM8aoos4ijXtmEuessFvd4oUBI";
  const secret =
    env.SHEET_SYNC_SECRET || `fbos-${randomBytes(16).toString("hex")}`;
  const webapp =
    env.GOOGLE_WEBAPP_URL ||
    "https://script.google.com/macros/s/AKfycbzqkpY-z-fuXhdHp6s1sn090ZuqWzU1x7CbGC1hciDKUPqvmQFHKhQ6HM9P4U1pBBa6iw/exec";

  upsertEnv({
    SHEET_SYNC_SECRET: secret,
    GOOGLE_WEBAPP_URL: webapp,
    GOOGLE_SHEET_GID_FINANCE: env.GOOGLE_SHEET_GID_FINANCE || env.GOOGLE_SHEET_GID || "339902754",
    GOOGLE_SHEET_GID_LEADS: env.GOOGLE_SHEET_GID_LEADS || "339902754",
    GOOGLE_SHEET_GID_ORDERS: env.GOOGLE_SHEET_GID_ORDERS || "443214491",
    FBOS_FINANCE_HUB_ONLY: "true",
  });

  console.log("Updated .env.local:");
  console.log("  SHEET_SYNC_SECRET=***");
  console.log("  GOOGLE_WEBAPP_URL=", webapp);
  console.log("  GOOGLE_SHEET_GID_FINANCE=", env.GOOGLE_SHEET_GID_FINANCE || env.GOOGLE_SHEET_GID || "339902754");

  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );
  const checks = {};
  for (const col of ["voucher_no", "party_name", "debit"]) {
    const { error } = await sb.from("finance_import_queue").select(col).limit(1);
    checks[`finance_import_queue.${col}`] = error ? error.message : "ok";
  }
  const { error: logErr } = await sb.from("sheet_sync_log").select("id").limit(1);
  checks.sheet_sync_log = logErr ? logErr.message : "ok";

  console.log("\nSupabase checks:");
  console.log(JSON.stringify(checks, null, 2));
  if (Object.values(checks).some((v) => v !== "ok")) {
    console.log("\n→ Run supabase/migrations/007_sheet_hub_extended.sql in SQL Editor");
  }

  const gid = env.GOOGLE_SHEET_GID_FINANCE || env.GOOGLE_SHEET_GID || "339902754";
  const probe = await probeCsv(sheetId, gid);
  console.log("\nSheet CSV probe gid=" + gid + ":", probe.ok ? probe.headers : probe.reason);

  try {
    const w = await fetch(webapp, { method: "GET", redirect: "follow" });
    const t = await w.text();
    console.log("\nWebapp GET:", w.status, t.slice(0, 120));
  } catch (e) {
    console.log("\nWebapp GET failed:", e.message);
  }

  console.log("\n--- Next step: Tally cloud (WSIPL-89-72) ---");
  console.log("Install scripts/tally-cloud/TallyToSheet.ps1 via Task Scheduler every 2 hours.");
  console.log("Set GOOGLE_WEBAPP_URL on cloud server to the deployed Apps Script URL.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
