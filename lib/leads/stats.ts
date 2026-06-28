import { leadDedupeKey } from "@/lib/leads/dedupe";
import { getAdminClient } from "@/lib/supabase/admin";

export type LeadStatsResult = {
  total: number;
  unique: number;
  duplicates: number;
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

export async function getLeadStats(): Promise<LeadStatsResult> {
  console.log("getLeadStats() called");
  const client = getAdminClient();
  console.log("adminClient is null?", client === null);

  if (!client) {
    throw new Error(
      "Supabase admin client unavailable: SUPABASE_SERVICE_ROLE_KEY is not set"
    );
  }

  const { count: totalCount, error: countErr } = await client
    .from("leads")
    .select("*", { count: "exact", head: true });

  console.log(
    "getLeadStats() count response:",
    JSON.stringify({ totalCount, error: countErr })
  );

  if (countErr) {
    throw countErr;
  }

  const { data: allLeads, error: leadsErr } = await client
    .from("leads")
    .select("id, company_name, mobile, email, status, source, created_at")
    .order("created_at", { ascending: false })
    .limit(10000);

  console.log("getLeadStats() raw response:", JSON.stringify(allLeads));
  console.log("getLeadStats() error:", JSON.stringify(leadsErr));

  if (leadsErr) {
    throw leadsErr;
  }

  const leads = allLeads || [];
  const uniqueKeys = new Set<string>();
  for (const lead of leads) {
    const key = leadDedupeKey(lead);
    if (key) uniqueKeys.add(key);
  }

  const statusBreakdown: Record<string, number> = {};
  const sourceBreakdown: Record<string, number> = {};
  for (const lead of leads) {
    const st = (lead.status || "NEW").toUpperCase();
    statusBreakdown[st] = (statusBreakdown[st] || 0) + 1;
    const src = lead.source || "Unknown";
    sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
  }

  const topSources = Object.entries(sourceBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const recentLeads = leads.slice(0, 8).map((l) => ({
    id: l.id,
    company_name: l.company_name,
    status: l.status || "NEW",
    source: l.source || "Unknown",
    created_at: l.created_at,
  }));

  return {
    total: totalCount || 0,
    unique: uniqueKeys.size,
    duplicates: (totalCount || 0) - uniqueKeys.size,
    statusBreakdown,
    topSources,
    recentLeads,
  };
}
