import {
  apiError,
  apiSuccess,
  authorize,
  getServerSupabase,
} from "@/lib/rbac/api-auth";

export async function GET() {
  const auth = await authorize("clients", "read");
  if ("error" in auth) return auth.error;

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return apiError(error.message, 500);
  return apiSuccess(data || []);
}

export async function POST(request: Request) {
  const auth = await authorize("clients", "create");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const body = await request.json();
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("clients")
    .insert([{ ...body, created_by: ctx.userId, updated_by: ctx.userId }])
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiSuccess(data, 201);
}
