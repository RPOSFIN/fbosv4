import {
  apiError,
  apiSuccess,
  authorize,
  getServerSupabase,
  writeActivityLog,
} from "@/lib/rbac/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await authorize("leads", "update");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const { id } = await params;
  const body = await request.json();
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("leads")
    .update({ ...body, updated_by: ctx.userId })
    .eq("id", id)
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  await writeActivityLog({
    entity_type: "lead",
    entity_id: id,
    action: "updated",
    user_id: ctx.userId,
    user_name: ctx.fullName || ctx.email,
    notes: body.status ? `status:${body.status}` : undefined,
  });

  return apiSuccess(data);
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await authorize("leads", "delete");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const { id } = await params;
  const supabase = await getServerSupabase();

  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) return apiError(error.message, 500);

  await writeActivityLog({
    entity_type: "lead",
    entity_id: id,
    action: "deleted",
    user_id: ctx.userId,
    user_name: ctx.fullName || ctx.email,
  });

  return apiSuccess({ id });
}
