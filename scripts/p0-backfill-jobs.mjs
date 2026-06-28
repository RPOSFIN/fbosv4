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

const { data: sample } = await sb.from("leads").select("id, company_name, clickup_task_id, status, source").limit(3);
const { count: withCu } = await sb.from("leads").select("id", { head: true, count: "exact" }).not("clickup_task_id", "is", null);
const { count: jobsBefore } = await sb.from("jobs").select("id", { head: true, count: "exact" });

const { data: leadsForJobs } = await sb
  .from("leads")
  .select("company_name, clickup_task_id, status")
  .not("clickup_task_id", "is", null)
  .limit(50);

let jobsInserted = 0;
for (const lead of leadsForJobs || []) {
  const job_no = `CU-${String(lead.clickup_task_id).trim()}`;
  const { data: existing } = await sb.from("jobs").select("id").eq("job_no", job_no).maybeSingle();
  if (existing?.id) continue;
  const { error } = await sb.from("jobs").insert({
    job_no,
    status: lead.status || "Created",
  });
  if (!error) jobsInserted++;
}

const { count: jobsAfter } = await sb.from("jobs").select("id", { head: true, count: "exact" });

console.log(JSON.stringify({
  ref: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0],
  sample,
  leadsWithClickupTaskId: withCu,
  jobsBefore,
  jobsInserted,
  jobsAfter,
}, null, 2));
