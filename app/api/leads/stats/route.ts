import {
  apiError,
  apiSuccess,
  authorize,
  getServerSupabase,
} from "@/lib/rbac/api-auth";
import { leadDedupeKey } from "@/lib/leads/dedupe";

export async function GET() {
  const auth = await authorize("leads", "read");
  if ("error" in auth) return auth.error;

  const supabase = await getServerSupabase();

  const { count: totalCount, error: countErr } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true });

  if (countErr) return apiError(countErr.message, 500);

  const { data: allLeads, error: leadsErr } = await supabase
    .from("leads")
    .select("id, company_name, mobile, email, status, source, created_at")
    .order("created_at", { ascending: false })
    .limit(10000);

  if (leadsErr) return apiError(leadsErr.message, 500);

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

  return apiSuccess({
    total: totalCount || 0,
    unique: uniqueKeys.size,
    duplicates: (totalCount || 0) - uniqueKeys.size,
    statusBreakdown,
    topSources,
    recentLeads,
  });
}
