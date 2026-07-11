import {
  apiError,
  apiSuccess,
  authorize,
  getServerSupabase,
  writeActivityLog,
} from "@/lib/rbac/api-auth";
import {
  fetchFollowups,
  fetchTodayFollowups,
  filterPendingForLead,
} from "@/lib/followups/fetch";
import { resolveFollowupDbShape } from "@/lib/followups/constants";
import { denormalizeFollowupForWrite } from "@/lib/followups/query";
import { getAdminClient } from "@/lib/supabase/admin";

async function getFollowupsSupabase() {
  return getAdminClient() ?? (await getServerSupabase());
}

export async function GET(request: Request) {
  const auth = await authorize("followups", "read");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");
  const accumulate = searchParams.get("accumulate") === "true";
  const leadId = searchParams.get("lead_id");

  try {
    const supabase = await getFollowupsSupabase();

    if (view === "today" && accumulate) {
      const result = await fetchTodayFollowups(supabase);
      return apiSuccess(result);
    }

    if (leadId) {
      const rows = await fetchFollowups(supabase, { leadId });
      return apiSuccess(filterPendingForLead(rows));
    }

    const data = await fetchFollowups(supabase);
    return apiSuccess(data);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to load followups", 500);
  }
}

export async function POST(request: Request) {
  const auth = await authorize("followups", "create");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const body = await request.json();
  const supabase = await getFollowupsSupabase();
  const shape = await resolveFollowupDbShape(supabase);

  const payload = denormalizeFollowupForWrite(
    {
      ...body,
      lead_id: body.lead_id || null,
      status: body.status || "Pending",
      created_by: ctx.userId,
      updated_by: ctx.userId,
    },
    shape
  );

  const { data, error } = await supabase
    .from("followups")
    .insert([payload])
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  await writeActivityLog({
    entity_type: "followup",
    entity_id: data.id,
    action: "created",
    user_id: ctx.userId,
    user_name: ctx.fullName || ctx.email,
    notes: body.company_name || undefined,
  });

  return apiSuccess(data, 201);
}
