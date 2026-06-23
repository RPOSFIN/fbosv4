import { apiError, apiSuccess, authorize, getServerSupabase, writeActivityLog } from "@/lib/rbac/api-auth";
import { getLeads } from "@/lib/services/lead-service";

export async function GET(request: Request) {
  const auth = await authorize("leads", "read");
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || "50")));
  const search = url.searchParams.get("search")?.trim() || "";
  const status = url.searchParams.get("status")?.trim() || "";
  const source = url.searchParams.get("source")?.trim() || "";
  const paginated = url.searchParams.has("page") || url.searchParams.has("limit");

  try {
    const result = await getLeads({ page, limit, search, status, source });

    if (paginated) {
      return apiSuccess({
        leads: result.leads,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
    }

    return apiSuccess(result.leads);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load leads";
    return apiError(message, 500);
  }
}

export async function POST(request: Request) {
  const auth = await authorize("leads", "create");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const body = await request.json();
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("leads")
    .insert([
      {
        company_name: body.company_name,
        contact_person: body.contact_person,
        mobile: body.mobile,
        email: body.email,
        status: body.status || "NEW",
        source: body.source,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
    ])
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  await writeActivityLog({
    entity_type: "lead",
    entity_id: data.id,
    action: "created",
    user_id: ctx.userId,
    user_name: ctx.fullName || ctx.email,
    notes: data.company_name,
  });

  return apiSuccess(data, 201);
}
