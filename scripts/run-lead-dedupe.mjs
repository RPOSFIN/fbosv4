#!/usr/bin/env node
/** One-off: dedupe existing leads (keeps latest per company+mobile/email) */
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
const PAGE = 1000;
const DELETE_CHUNK = 50;

function leadDedupeKey(lead) {
  const company = (lead.company_name || "").toLowerCase().trim();
  if (!company) return "";
  const mobile = (lead.mobile || "").replace(/\D/g, "");
  const email = (lead.email || "").toLowerCase().trim();
  const contact = mobile || email;
  return contact ? `${company}|${contact}` : company;
}

async function ensureClickUpColumn() {
  const { error } = await supabase.from("leads").select("clickup_task_id").limit(1);
  if (!error) {
    console.log("OK    leads.clickup_task_id column exists");
    return true;
  }
  console.log("WARN  clickup_task_id missing — apply supabase/migrations/005_leads_clickup_dedupe.sql in SQL Editor");
  return false;
}

async function fetchAllLeads(includeClickUp) {
  const all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function dedupeLeads(includeClickUp) {
  const all = await fetchAllLeads(includeClickUp);
  console.log(`Found ${all.length} leads`);

  const seenByKey = new Map();
  const seenByClickUp = new Map();
  const toDelete = [];

  const sorted = [...all].sort((a, b) => {
    const aTs = new Date(a.updated_at || a.created_at || 0).getTime();
    const bTs = new Date(b.updated_at || b.created_at || 0).getTime();
    return bTs - aTs;
  });

  for (const lead of sorted) {
    const key = leadDedupeKey(lead);
    const clickupId = includeClickUp ? lead.clickup_task_id?.trim() : undefined;
    let isDuplicate = false;

    if (clickupId) {
      if (seenByClickUp.has(clickupId)) isDuplicate = true;
      else seenByClickUp.set(clickupId, lead.id);
    }
    if (!isDuplicate && key) {
      if (seenByKey.has(key)) isDuplicate = true;
      else seenByKey.set(key, lead.id);
    }
    if (isDuplicate) toDelete.push(lead.id);
  }

  console.log(`Removing ${toDelete.length} duplicates (keeping latest)`);

  for (let i = 0; i < toDelete.length; i += DELETE_CHUNK) {
    const chunk = toDelete.slice(i, i + DELETE_CHUNK);
    const { error } = await supabase.from("leads").delete().in("id", chunk);
    if (error) throw error;
  }

  return { totalBefore: all.length, totalAfter: all.length - toDelete.length, removed: toDelete.length };
}

async function main() {
  console.log("FBOS Lead Dedupe");
  console.log("---");
  const includeClickUp = await ensureClickUpColumn();
  const result = await dedupeLeads(includeClickUp);
  console.log(`Dedupe: ${result.totalBefore} → ${result.totalAfter} (removed ${result.removed})`);
  console.log("---");
  console.log("Done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
