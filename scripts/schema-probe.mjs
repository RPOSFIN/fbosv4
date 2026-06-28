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
const j = await sb.from("jobs").select("*").limit(1);
console.log("jobs keys:", j.data?.[0] ? Object.keys(j.data[0]) : j.error);
for (const t of ["activity_logs", "audit_logs", "integrations"]) {
  const r = await sb.from(t).select("id", { head: true, count: "exact" });
  console.log(t, r.error?.code || "ok", r.count);
}
