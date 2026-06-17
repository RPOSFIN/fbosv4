import {
  apiError,
  apiSuccess,
  authorize,
  getServerSupabase,
  writeActivityLog,
} from "@/lib/rbac/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await authorize("followups", "update");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const { id } = await params;
  const body = await request.json();
  const supabase = await getServerSupabase();

  const updates: Record<string, unknown> = { updated_by: ctx.userId };
  if (body.status !== undefined) updates.status = body.status;
  if (body.next_followup !== undefined) updates.next_followup = body.next_followup;
  if (body.notes !== undefined) updates.notes = body.notes;

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
