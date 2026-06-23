import { getAdminClient } from "@/lib/supabase/admin";
import { getDashboardStatus } from "@/lib/dashboard/status";

export type JobRecord = {
  id: string;
  job_no: string;
  client_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type JobListItem = {
  id: string;
  job_no: string;
  status: string;
  client_name: string | null;
  product: null;
  quantity: null;
  amount: number;
  order_date: null;
  delivery_date: null;
  production_stage: null;
  designer: null;
  notes: null;
  created_at: string;
  updated_at: string;
};

export type OperationsMetrics = {
  totalOrders: number;
  dispatched: number;
  inProduction: number;
  pending: number;
  artworkPending: number;
  dispatchDelayed: number;
  overdueOrders: number;
  highPriority: number;
};

export async function getJobs(input: { limit?: number; status?: string } = {}): Promise<{
  jobs: JobListItem[];
  count: number;
}> {
  const supabase = getAdminClient();
  if (!supabase) {
    return { jobs: [], count: 0 };
  }

  const limit = Math.min(200, Math.max(1, input.limit || 100));
  const status = input.status?.trim() || "";

  let query = supabase
    .from("jobs")
    .select("id, job_no, client_id, status, created_at, updated_at", {
      count: "exact",
    })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const jobRows = (data || []) as JobRecord[];
  const clientIds = [...new Set(jobRows.map((r) => r.client_id).filter(Boolean))] as string[];

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

  return { jobs, count: count ?? jobs.length };
}

export async function getOperationsMetrics(): Promise<OperationsMetrics> {
  const supabase = getAdminClient();
  if (!supabase) {
    const dashboard = await getDashboardStatus();
    const jobs = dashboard.counts.jobs;
    return {
      totalOrders: jobs,
      dispatched: 0,
      inProduction: 0,
      pending: jobs,
      artworkPending: 0,
      dispatchDelayed: 0,
      overdueOrders: jobs,
      highPriority: 0,
    };
  }

  const { data, count } = await supabase
    .from("jobs")
    .select("status, dispatch_status, invoice_status", { count: "exact" });

  const jobs = data || [];
  const dispatched = jobs.filter((j) =>
    String(j.dispatch_status || j.status || "").toUpperCase().includes("DISPATCH")
  ).length;
  const inProduction = jobs.filter((j) =>
    String(j.status || "").toUpperCase().includes("PRODUCTION")
  ).length;
  const pending = jobs.filter((j) =>
    ["PENDING", "CREATED", "OPEN"].some((s) =>
      String(j.status || "").toUpperCase().includes(s)
    )
  ).length;

  return {
    totalOrders: count ?? jobs.length,
    dispatched,
    inProduction: inProduction || Math.max(0, jobs.length - dispatched - pending),
    pending,
    artworkPending: 0,
    dispatchDelayed: 0,
    overdueOrders: pending,
    highPriority: 0,
  };
}
