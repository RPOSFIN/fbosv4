import {
  apiError,
  apiSuccess,
  authorize,
  getServerSupabase,
  writeActivityLog,
} from "@/lib/rbac/api-auth";
import { getAdminClient } from "@/lib/supabase/admin";

async function getLeadsSupabase() {
  const admin = getAdminClient();
  if (admin) return admin;
  return getServerSupabase();
}

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

  const supabase = await getLeadsSupabase();
  if (!getAdminClient()) {
    console.warn(
      "[api/leads] SUPABASE_SERVICE_ROLE_KEY missing — RLS may hide rows. SUPA keys:",
      Object.keys(process.env).filter((k) => k.includes("SUPA"))
    );
  }

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `company_name.ilike.%${search}%,contact_person.ilike.%${search}%,mobile.ilike.%${search}%`
    );
  }
  if (status) query = query.eq("status", status);
  if (source) query = query.eq("source", source);

  if (paginated) {
    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);
  }

  const { data, error, count } = await query;

  if (error) return apiError(error.message, 500);

  if (paginated) {
    return apiSuccess({
      leads: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  }

  return apiSuccess(data || []);
}

export async function POST(request: Request) {
  const auth = await authorize("leads", "create");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const body = await request.json();
  const supabase = await getLeadsSupabase();

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
