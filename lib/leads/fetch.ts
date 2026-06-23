import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase/admin";
import { leadDedupeKey } from "@/lib/leads/dedupe";

export type LeadRow = {
  id: string;
  company_name: string;
  contact_person?: string | null;
  mobile?: string | null;
  email?: string | null;
  status?: string | null;
  source?: string | null;
  clickup_task_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type LeadSalesMetrics = {
  totalLeads: number;
  won: number;
  lost: number;
  active: number;
  dormantLeads: number;
};

export type LeadStats = {
  total: number;
  unique: number;
  duplicates: number;
  won: number;
  lost: number;
  active: number;
  statusBreakdown: Record<string, number>;
  topSources: Array<{ name: string; count: number }>;
  recentLeads: Array<{
    id: string;
    company_name: string;
    status: string;
    source: string;
    created_at: string;
  }>;
};

export type LeadsPageResult = {
  leads: LeadRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function getAnonClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getReadClient(): SupabaseClient | null {
  return getAdminClient() || getAnonClient();
}

function toNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStatusBreakdown(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    out[key] = toNumber(value);
  }
  return out;
}

function normalizeSourceBreakdown(raw: unknown): Array<{ name: string; count: number }> {
  const breakdown = normalizeStatusBreakdown(raw);
  return Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
}

function computeMetricsFromStatuses(
  total: number,
  statusBreakdown: Record<string, number>
): Pick<LeadSalesMetrics, "won" | "lost" | "active"> {
  const won = statusBreakdown.WON || 0;
  const lost = statusBreakdown.LOST || 0;
  const active = Math.max(0, total - won - lost);
  return { won, lost, active };
}

function buildStatsFromRows(leads: LeadRow[]): LeadStats {
  const statusBreakdown: Record<string, number> = {};
  const sourceBreakdown: Record<string, number> = {};
  const uniqueKeys = new Set<string>();

  for (const lead of leads) {
    const status = (lead.status || "NEW").toUpperCase();
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    const source = lead.source?.trim() || "Unknown";
    sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
    const key = leadDedupeKey(lead);
    if (key) uniqueKeys.add(key);
  }

  const total = leads.length;
  const { won, lost, active } = computeMetricsFromStatuses(total, statusBreakdown);

  return {
    total,
    unique: uniqueKeys.size,
    duplicates: Math.max(0, total - uniqueKeys.size),
    won,
    lost,
    active,
    statusBreakdown,
    topSources: Object.entries(sourceBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count })),
    recentLeads: leads.slice(0, 8).map((lead) => ({
      id: lead.id,
      company_name: lead.company_name,
      status: lead.status || "NEW",
      source: lead.source?.trim() || "Unknown",
      created_at: lead.created_at || "",
    })),
  };
}

export async function fetchLeadsPage(input: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  source?: string;
}): Promise<LeadsPageResult> {
  const page = Math.max(1, input.page || 1);
  const limit = Math.min(200, Math.max(1, input.limit || 50));
  const search = input.search?.trim() || "";
  const status = input.status?.trim() || "";
  const source = input.source?.trim() || "";

  const admin = getAdminClient();
  if (admin) {
    let query = admin
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

    const from = (page - 1) * limit;
    const { data, error, count } = await query.range(from, from + limit - 1);
    if (error) throw new Error(error.message);

    const total = count || 0;
    return {
      leads: (data || []) as LeadRow[],
      total,
      page,
      limit,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    };
  }

  const client = getAnonClient();
  if (!client) {
    return { leads: [], total: 0, page, limit, totalPages: 0 };
  }

  const { data, error } = await client.rpc("get_leads_page", {
    p_page: page,
    p_limit: limit,
    p_search: search,
    p_status: status,
    p_source: source,
  });
  if (error) throw new Error(error.message);

  const result = (data || {}) as LeadsPageResult;
  return {
    leads: (result.leads || []) as LeadRow[],
    total: toNumber(result.total),
    page: toNumber(result.page) || page,
    limit: toNumber(result.limit) || limit,
    totalPages: toNumber(result.totalPages),
  };
}

export async function fetchLeadStats(): Promise<LeadStats> {
  const admin = getAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from("leads")
      .select("id, company_name, mobile, email, status, source, created_at")
      .order("created_at", { ascending: false })
      .limit(10000);
    if (error) throw new Error(error.message);
    return buildStatsFromRows((data || []) as LeadRow[]);
  }

  const client = getAnonClient();
  if (!client) {
    return {
      total: 0,
      unique: 0,
      duplicates: 0,
      won: 0,
      lost: 0,
      active: 0,
      statusBreakdown: {},
      topSources: [],
      recentLeads: [],
    };
  }

  const { data, error } = await client.rpc("get_leads_stats");
  if (error) throw new Error(error.message);

  const raw = (data || {}) as Record<string, unknown>;
  const total = toNumber(raw.total);
  const unique = toNumber(raw.unique);
  const statusBreakdown = normalizeStatusBreakdown(raw.statusBreakdown);
  const metrics = computeMetricsFromStatuses(total, statusBreakdown);

  return {
    total,
    unique,
    duplicates: Math.max(0, total - unique),
    won: toNumber(raw.won) || metrics.won,
    lost: toNumber(raw.lost) || metrics.lost,
    active: toNumber(raw.active) || metrics.active,
    statusBreakdown,
    topSources: normalizeSourceBreakdown(raw.sourceBreakdown),
    recentLeads: Array.isArray(raw.recentLeads)
      ? (raw.recentLeads as LeadStats["recentLeads"])
      : [],
  };
}

export async function fetchLeadSalesMetrics(): Promise<LeadSalesMetrics> {
  const stats = await fetchLeadStats();
  return {
    totalLeads: stats.total,
    won: stats.won,
    lost: stats.lost,
    active: stats.active,
    dormantLeads: 0,
  };
}

export async function fetchAllLeadStatuses(): Promise<
  Array<{ status: string | null }>
> {
  const client = getReadClient();
  if (!client) return [];

  if (getAdminClient()) {
    const { data, error } = await client.from("leads").select("status");
    if (error) throw new Error(error.message);
    return (data || []) as Array<{ status: string | null }>;
  }

  const page = await fetchLeadsPage({ page: 1, limit: 200 });
  return page.leads.map((lead) => ({ status: lead.status || null }));
}
