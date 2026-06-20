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
const sel = await sb.from("activity_logs").select("id, entity_type, action, user_name, notes, created_at").limit(3);
console.log("select", sel.error?.code, sel.error?.message, sel.data?.length);
const ins = await sb.from("activity_logs").insert([{
  entity_type: "chat_message",
  entity_id: "internal",
  action: "message",
  user_id: "00000000-0000-0000-0000-000000000001",
  user_name: "Test",
  notes: "probe message",
}]).select().single();
console.log("insert", ins.error?.code, ins.error?.message, ins.data?.id);
