#!/usr/bin/env node
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
    const key = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();
process.chdir(root);

const { syncGSheet } = await import("../lib/integrations/gsheet.ts");
const { leadMatchKeys, importLeadsWithDedupe } = await import("../lib/leads/dedupe.ts");
const { getGSheetCsvUrl } = await import("../lib/google-config.ts");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const csvUrl = getGSheetCsvUrl();
const res = await fetch(csvUrl, { cache: "no-store" });
const text = await res.text();
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = lines[0].split(",");

function parseRow(line) {
  const cols = line.split(",");
  const raw = {};
  headers.forEach((h, i) => { raw[h.toLowerCase().replace(/\s+/g, "_")] = (cols[i] || "").trim(); });
  const company = raw.company_name || raw.company || raw.business_name || "";
  if (!company) return null;
  return {
    company_name: company,
    mobile: raw.mobile || raw.phone || "",
    email: raw.email || "",
    status: raw.status || "NEW",
    source: "Google Sheets",
  };
}

const sheetRows = lines.slice(1).map(parseRow).filter(Boolean);
console.log("Sheet rows:", sheetRows.length);

const { count } = await supabase.from("leads").select("*", { count: "exact", head: true });
console.log("DB count:", count);

let noMatch = 0;
const samples = [];

const { data: allLeads } = await supabase.from("leads").select("*").limit(5000);

const byKey = new Map();
for (const lead of allLeads || []) {
  for (const k of leadMatchKeys(lead)) {
    if (!byKey.has(k)) byKey.set(k, lead.id);
  }
}

for (const row of sheetRows) {
  const keys = leadMatchKeys(row);
  const hit = keys.some((k) => byKey.has(k));
  if (!hit) {
    noMatch++;
    if (samples.length < 5) samples.push({ row, keys });
  }
}

console.log("Sheet rows with no DB key match:", noMatch);
console.log("Samples:", JSON.stringify(samples, null, 2));
