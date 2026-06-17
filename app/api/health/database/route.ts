import {
  apiSuccess,
  authorize,
  getServerSupabase,
} from "@/lib/rbac/api-auth";
import { getAdminClient } from "@/lib/supabase/admin";

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
  "integrations",
];

export async function GET() {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const client = getAdminClient() ?? (await getServerSupabase());
  const results: Record<string, { ok: boolean; error?: string }> = {};

  for (const table of REQUIRED_TABLES) {
    const { error } = await client.from(table).select("id", {
      head: true,
      count: "exact",
    });
    results[table] = error ? { ok: false, error: error.message } : { ok: true };
  }

  const missing = Object.entries(results)
    .filter(([, v]) => !v.ok)
    .map(([table, v]) => ({ table, error: v.error }));

  return apiSuccess({
    ok: missing.length === 0,
    tables: results,
    missing,
    mode: getAdminClient() ? "service_role" : "authenticated",
  });
}
