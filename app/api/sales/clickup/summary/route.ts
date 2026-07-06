import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { normalizeClickUpSalesStatus } from "@/lib/integrations/clickup-leads";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const supabase = getAdminClient();
  if (!supabase) return apiError("Database not configured", 503);

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "20")));

  const { data, error, count } = await supabase
    .from("clickup_tasks")
    .select("id, external_id, name, status, list_name, space_name, synced_at", { count: "exact" })
    .order("synced_at", { ascending: false })
    .limit(5000);

  if (error) return apiError(error.message, 500);

  const rows = data || [];
  const byStatus: Record<string, number> = {};
  const byNormalizedStatus: Record<string, number> = {};

  for (const row of rows) {
    const raw = row.status || "unknown";
    byStatus[raw] = (byStatus[raw] || 0) + 1;
    const normalized = normalizeClickUpSalesStatus(row.status || undefined);
    byNormalizedStatus[normalized] = (byNormalizedStatus[normalized] || 0) + 1;
  }

  return apiSuccess({
    total: count ?? rows.length,
    sampled: rows.length,
    byStatus,
    byNormalizedStatus,
    recent: rows.slice(0, limit).map((row) => ({
      ...row,
      normalized_status: normalizeClickUpSalesStatus(row.status || undefined),
    })),
  });
}
