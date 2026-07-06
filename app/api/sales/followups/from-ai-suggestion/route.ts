import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tomorrowIsoDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const auth = await authorize("leads", "create");
  if ("error" in auth) return auth.error;

  const supabase = getAdminClient();
  if (!supabase) return apiError("Database not configured", 503);

  const body = await request.json().catch(() => ({}));
  const suggestionId = String(body.suggestionId || "").trim();
  if (!suggestionId) return apiError("suggestionId is required", 400);

  const nextFollowup = String(body.nextFollowup || tomorrowIsoDate()).slice(0, 10);
  const status = String(body.status || "Pending");

  const { data: suggestion, error: suggestionErr } = await supabase
    .from("sales_ai_suggestions")
    .select("id, lead_id, summary, next_action, suggestions, crm_actions")
    .eq("id", suggestionId)
    .single();

  if (suggestionErr || !suggestion) return apiError(suggestionErr?.message || "AI suggestion not found", 404);

  let lead: { id: string; company_name?: string | null; contact_person?: string | null } | null = null;
  if (suggestion.lead_id) {
    const { data: leadRow } = await supabase
      .from("leads")
      .select("id, company_name, contact_person")
      .eq("id", suggestion.lead_id)
      .maybeSingle();
    lead = leadRow || null;
  }

  const notes = [
    "Created from Sales AI Coach suggestion.",
    suggestion.next_action ? `Next action: ${suggestion.next_action}` : "",
    suggestion.summary ? `Summary: ${suggestion.summary}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const payload = {
    lead_id: suggestion.lead_id || null,
    company_name: body.companyName || lead?.company_name || "AI Coach Followup",
    contact_person: body.contactPerson || lead?.contact_person || null,
    next_followup: nextFollowup,
    status,
    notes,
    created_by: auth.ctx.userId,
    updated_by: auth.ctx.userId,
  };

  const { data: followup, error: followupErr } = await supabase
    .from("followups")
    .insert(payload)
    .select("id, lead_id, company_name, contact_person, next_followup, status, notes")
    .single();

  if (followupErr) return apiError(followupErr.message, 500);

  await supabase
    .from("sales_ai_suggestions")
    .update({ accepted_at: new Date().toISOString(), accepted_by: auth.ctx.userId })
    .eq("id", suggestionId);

  return apiSuccess({ followup });
}
