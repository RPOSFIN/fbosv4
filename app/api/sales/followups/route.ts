import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rangeStart(range: string) {
  const now = new Date();
  if (range === "all" || range === "custom") return null;
  const days: Record<string, number> = {
    today: 0,
    "3d": 3,
    "7d": 7,
    "30d": 30,
    "90d": 90,
  };
  if (range === "today") return new Date(now.toISOString().slice(0, 10)).toISOString();
  const d = days[range] ?? 3;
  now.setDate(now.getDate() - d);
  return now.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const auth = await authorize("leads", "read");
  if ("error" in auth) return auth.error;

  const supabase = getAdminClient();
  if (!supabase) return apiError("Database not configured", 503);

  const url = new URL(request.url);
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") || "100")));
  const range = url.searchParams.get("range") || "3d";
  const status = url.searchParams.get("status")?.trim() || "";
  const search = url.searchParams.get("search")?.trim() || "";
  const from = url.searchParams.get("from") || rangeStart(range);
  const to = url.searchParams.get("to") || "";

  let query = supabase
    .from("followups")
    .select("id, lead_id, company_name, contact_person, next_followup, status, notes, created_at, updated_at", { count: "exact" })
    .order("next_followup", { ascending: true })
    .limit(limit);

  if (from) query = query.gte("next_followup", from);
  if (to) query = query.lte("next_followup", to);
  if (status && status !== "all") query = query.eq("status", status);
  if (search) query = query.or(`company_name.ilike.%${search}%,contact_person.ilike.%${search}%,notes.ilike.%${search}%`);

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 500);

  return apiSuccess({ followups: data || [], total: count || 0, range, status, from, to });
}

export async function PATCH(request: Request) {
  const auth = await authorize("leads", "update");
  if ("error" in auth) return auth.error;

  const supabase = getAdminClient();
  if (!supabase) return apiError("Database not configured", 503);

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  const status = String(body.status || "").trim();
  if (!id) return apiError("id is required", 400);
  if (!status) return apiError("status is required", 400);

  const { data, error } = await supabase
    .from("followups")
    .update({ status, updated_by: auth.ctx.userId, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, status, updated_at")
    .single();

  if (error) return apiError(error.message, 500);
  return apiSuccess({ followup: data });
}
