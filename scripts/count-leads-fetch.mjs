#!/usr/bin/env node
import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    if (!process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1);
  }
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PAGE = 1000;
let all = [];
let offset = 0;
while (true) {
  const { data, error } = await sb.from("leads").select("id").order("created_at", { ascending: true }).range(offset, offset + PAGE - 1);
  if (error) { console.log("ERR", offset, error.message); break; }
  if (!data?.length) break;
  all.push(...data);
  if (data.length < PAGE) break;
  offset += PAGE;
}
const { count } = await sb.from("leads").select("*", { count: "exact", head: true });
console.log("fetched", all.length, "count", count);
