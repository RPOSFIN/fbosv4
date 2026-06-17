import {
  apiError,
  apiSuccess,
  authorize,
  getServerSupabase,
  writeActivityLog,
} from "@/lib/rbac/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await authorize("jobs", "create");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const { id: clientId } = await params;
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("jobs")
    .insert([
      {
        client_id: clientId,
        job_no: `JOB-${Date.now()}`,
        status: "Created",
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
    ])
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  await writeActivityLog({
    entity_type: "job",
    entity_id: data.id,
    action: "created",
    user_id: ctx.userId,
    user_name: ctx.fullName || ctx.email,
    notes: data.job_no,
  });

  return apiSuccess(data, 201);
}
