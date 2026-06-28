import {
  apiError,
  apiSuccess,
  authorize,
  getServerSupabase,
  writeActivityLog,
} from "@/lib/rbac/api-auth";
import { resolveFollowupDbShape } from "@/lib/followups/constants";
import { denormalizeFollowupForWrite } from "@/lib/followups/query";
import { getAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

async function getFollowupsSupabase() {
  return getAdminClient() ?? (await getServerSupabase());
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await authorize("followups", "update");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const { id } = await params;
  const body = await request.json();
  const supabase = await getFollowupsSupabase();
  const shape = await resolveFollowupDbShape(supabase);

  const updates = denormalizeFollowupForWrite(
    { ...body, updated_by: ctx.userId },
    shape
  );

  const { data, error } = await supabase
    .from("followups")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  const action =
    body.status?.toLowerCase() === "completed"
      ? "completed"
      : body.next_followup
        ? "rescheduled"
        : "updated";

  await writeActivityLog({
    entity_type: "followup",
    entity_id: id,
    action,
    user_id: ctx.userId,
    user_name: ctx.fullName || ctx.email,
    notes: data.company_name || undefined,
  });

  return apiSuccess(data);
}
