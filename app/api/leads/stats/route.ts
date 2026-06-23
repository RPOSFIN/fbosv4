import {
  apiError,
  apiSuccess,
  authorize,
  getServerSupabase,
} from "@/lib/rbac/api-auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { leadDedupeKey } from "@/lib/leads/dedupe";

export async function GET() {
  const auth = await authorize("leads", "read");
  if ("error" in auth) return auth.error;

  const admin = getAdminClient();
  if (!admin) {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase.rpc("get_leads_stats");

    if (error) {
      return apiError(error.message || error.code || "get_leads_stats failed", 500);
    }

    return apiSuccess(data);
  }

  const { count: totalCount, error: countErr } = await admin
    .from("leads")
    .select("*", { count: "exact", head: true });

  if (countErr) {
    return apiError(countErr.message || countErr.code || "leads count failed", 500);
  }

  const { data: allLeads, error: leadsErr } = await admin
    .from("leads")
    .select("id, company_name, mobile, email, status, source, created_at")
    .order("created_at", { ascending: false })
    .limit(10000);

  if (leadsErr) {
    return apiError(leadsErr.message || leadsErr.code || "leads read failed", 500);
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

  const won = statusBreakdown.WON || 0;
  const lost = statusBreakdown.LOST || 0;
  const active = Math.max(0, (totalCount || 0) - won - lost);

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
    won,
    lost,
    active,
    statusBreakdown,
    topSources,
    recentLeads,
  });
}
