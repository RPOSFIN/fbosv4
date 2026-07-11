#!/usr/bin/env node
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  if (!process.env[trimmed.slice(0, idx).trim()]) {
    process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: leads } = await sb
  .from("leads")
  .select("clickup_task_id, company_name, status, source")
  .not("clickup_task_id", "is", null);

const payload = (leads || [])
  .filter((l) => l.clickup_task_id?.trim())
  .map((l) => ({
    external_id: String(l.clickup_task_id).trim(),
    name: String(l.company_name || "ClickUp task"),
    status: l.status || null,
    list_name: l.source === "ClickUp" ? "Lead CRM" : null,
    synced_at: new Date().toISOString(),
  }));

console.log("payload count:", payload.length);

const upsert = await sb.from("clickup_tasks").upsert(payload, { onConflict: "external_id" }).select("id");
console.log("upsert:", JSON.stringify(upsert, null, 2));

const count = await sb.from("clickup_tasks").select("*", { head: true, count: "exact" });
console.log("count:", count);
