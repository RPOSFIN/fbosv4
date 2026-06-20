import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  if (!process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { count, error } = await sb.from("finance_import_queue").select("*", { head: true, count: "exact" });
const { count: jobs } = await sb.from("jobs").select("*", { head: true, count: "exact" });
const sample = await sb.from("finance_import_queue").select("source, record_type, amount, party_name").limit(3);
console.log({ finance: count, financeErr: error?.message, jobs, sample: sample.data });
