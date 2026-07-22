import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getAdminClient } from "@/lib/supabase/admin";

type JobRecord = {
  id: string;
  job_no: string;
  client_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

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
    .select("id, job_no, client_id, status, created_at, updated_at", {
      count: "exact",
    })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 500);

  const jobRows = (data || []) as JobRecord[];
  const clientIds = [
    ...new Set(jobRows.map((r) => r.client_id).filter(Boolean)),
  ] as string[];

  const clientMap = new Map<string, string>();
  if (clientIds.length) {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, company_name")
      .in("id", clientIds);
    for (const c of clients || []) {
      clientMap.set(c.id, c.company_name);
    }
  }

  const jobs = jobRows.map((row) => ({
    id: row.id,
    job_no: row.job_no,
    status: row.status,
    client_name: row.client_id ? clientMap.get(row.client_id) ?? null : null,
    product: null,
    quantity: null,
    amount: 0,
    order_date: null,
    delivery_date: null,
    production_stage: null,
    designer: null,
    notes: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  return apiSuccess({ jobs, count: count ?? jobs.length });
}
