import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const supabase = getAdminClient();
  if (!supabase) {
    return apiSuccess({ jobs: [], count: 0 });
  }

  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || "100")));
  const status = url.searchParams.get("status")?.trim() || "";

  let query = supabase
    .from("jobs")
    .select(
      "id, job_no, client_id, status, created_at, updated_at, clients(company_name)",
      { count: "exact" }
    )
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 500);

  const jobs = (data || []).map((row) => {
    const clients = row.clients as { company_name: string } | { company_name: string }[] | null;
    const clientName = Array.isArray(clients)
      ? clients[0]?.company_name ?? null
      : clients?.company_name ?? null;

    return {
      id: row.id as string,
      job_no: row.job_no as string,
      status: row.status as string,
      client_name: clientName,
      product: null,
      quantity: null,
      amount: 0,
      order_date: null,
      delivery_date: null,
      production_stage: null,
      designer: null,
      notes: null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  });

  return apiSuccess({ jobs, count: count ?? jobs.length });
}
