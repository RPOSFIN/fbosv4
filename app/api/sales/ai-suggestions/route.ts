import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
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
  const leadId = url.searchParams.get("leadId")?.trim();

  let query = supabase
    .from("sales_ai_suggestions")
    .select(
      "id, lead_id, source, prompt_type, tone, summary, suggestions, crm_actions, next_action, accepted_at, rejected_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (leadId) query = query.eq("lead_id", leadId);

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 500);

  return apiSuccess({ suggestions: data || [], count: count ?? data?.length ?? 0 });
}

export async function PATCH(request: Request) {
  const auth = await authorize("call_coach", "update");
  if ("error" in auth) return auth.error;

  const supabase = getAdminClient();
  if (!supabase) return apiError("Database not configured", 503);

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  const decision = String(body.decision || "").trim().toLowerCase();
  if (!id) return apiError("id is required", 400);
  if (!["accepted", "rejected"].includes(decision)) {
    return apiError("decision must be accepted or rejected", 400);
  }

  const patch =
    decision === "accepted"
      ? { accepted_at: new Date().toISOString(), accepted_by: auth.ctx.userId, rejected_at: null, rejected_by: null }
      : { rejected_at: new Date().toISOString(), rejected_by: auth.ctx.userId, accepted_at: null, accepted_by: null };

  const { data, error } = await supabase
    .from("sales_ai_suggestions")
    .update(patch)
    .eq("id", id)
    .select("id, accepted_at, rejected_at")
    .single();

  if (error) return apiError(error.message, 500);
  return apiSuccess({ suggestion: data });
}
