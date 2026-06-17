import {
  apiError,
  apiSuccess,
  authorize,
  getServerSupabase,
  writeActivityLog,
} from "@/lib/rbac/api-auth";

export async function POST(request: Request) {
  const auth = await authorize("imports", "create");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const body = await request.json();
  const rows = (body.rows || []) as Array<{
    company_name?: string;
    contact_person?: string;
    mobile?: string;
  }>;

  if (!rows.length) return apiError("No rows to import", 400);

  const supabase = await getServerSupabase();
  const payload = rows.map((r) => ({
    company_name: r.company_name,
    contact_person: r.contact_person,
    mobile: r.mobile,
    source: "CSV IMPORT",
    status: "NEW",
    created_by: ctx.userId,
    updated_by: ctx.userId,
  }));

  const { data, error } = await supabase.from("leads").insert(payload).select();
  if (error) return apiError(error.message, 500);

  await writeActivityLog({
    entity_type: "import",
    action: "leads_imported",
    user_id: ctx.userId,
    user_name: ctx.fullName || ctx.email,
    notes: `${data?.length || 0} records`,
  });

  return apiSuccess({ imported: data?.length || 0 });
}
