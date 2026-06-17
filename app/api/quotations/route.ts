import {
  apiError,
  apiSuccess,
  authorize,
  getServerSupabase,
  writeActivityLog,
} from "@/lib/rbac/api-auth";

export async function GET() {
  const auth = await authorize("quotations", "read");
  if ("error" in auth) return auth.error;

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("quotations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return apiError(error.message, 500);
  return apiSuccess(data || []);
}

export async function POST(request: Request) {
  const auth = await authorize("quotations", "create");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const body = await request.json();
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("quotations")
    .insert([
      {
        quotation_no: body.quotation_no || `Q-${Date.now()}`,
        client_name: body.client_name,
        amount: Number(body.amount) || 0,
        status: body.status || "Sent",
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
    ])
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  await writeActivityLog({
    entity_type: "quotation",
    entity_id: data.id,
    action: "created",
    user_id: ctx.userId,
    user_name: ctx.fullName || ctx.email,
    notes: data.client_name,
  });

  return apiSuccess(data, 201);
}
