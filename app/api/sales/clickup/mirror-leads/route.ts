import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { normalizeClickUpSalesStatus } from "@/lib/integrations/clickup-leads";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rangeStart(range: string) {
  const now = new Date();
  if (range === "all" || range === "custom") return null;
  const days: Record<string, number> = {
    "3d": 3,
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "1y": 365,
  };
  const d = days[range] ?? 3;
  now.setDate(now.getDate() - d);
  return now.toISOString();
}

export async function GET(request: Request) {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const supabase = getAdminClient();
  if (!supabase) return apiError("Database not configured", 503);

  const url = new URL(request.url);
  const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get("limit") || "250")));
  const range = url.searchParams.get("range") || "3d";
  const from = url.searchParams.get("from") || rangeStart(range);
  const to = url.searchParams.get("to") || "";
  const status = (url.searchParams.get("status") || "all").trim();
  const search = (url.searchParams.get("search") || "").trim();

  let query = supabase
    .from("clickup_tasks")
    .select("id, external_id, name, status, list_name, space_name, synced_at", { count: "exact" })
    .order("synced_at", { ascending: false })
    .limit(limit);

  if (from) query = query.gte("synced_at", from);
  if (to) query = query.lte("synced_at", `${to}T23:59:59.999Z`);
  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 500);

  let rows = (data || []).map((row) => ({
    ...row,
    normalized_status: normalizeClickUpSalesStatus(row.status || undefined),
  }));

  if (status !== "all") rows = rows.filter((row) => row.normalized_status === status);

  const byNormalizedStatus: Record<string, number> = {};
  for (const row of rows) {
    byNormalizedStatus[row.normalized_status] = (byNormalizedStatus[row.normalized_status] || 0) + 1;
  }

  return apiSuccess({
    leads: rows,
    total: status === "all" ? count ?? rows.length : rows.length,
    sampled: rows.length,
    range,
    from,
    to,
    status,
    byNormalizedStatus,
  });
}
