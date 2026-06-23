import {
  apiError,
  apiSuccess,
  authorize,
  getServerSupabase,
  writeActivityLog,
} from "@/lib/rbac/api-auth";
import {
  buildFollowupUpdatePayload,
  updateFollowupRow,
} from "@/lib/followups/write";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await authorize("followups", "update");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const { id } = await params;
  const body = await request.json();
  const supabase = await getServerSupabase();

  const updates = buildFollowupUpdatePayload({
    status: body.status,
    next_followup: body.next_followup,
    notes: body.notes,
    updated_by: ctx.userId,
  });

  const { data, error } = await updateFollowupRow(supabase, id, updates);

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
