import {
  apiError,
  apiSuccess,
  authorize,
  getServerSupabase,
} from "@/lib/rbac/api-auth";
import {
  getIntegrationStatuses,
  getIntegrationSummary,
} from "@/lib/integrations/status";
import { countTodayFollowups } from "@/lib/followups/fetch";

export async function GET() {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const supabase = await getServerSupabase();
  const tables = ["leads", "followups", "quotations", "clients", "jobs"] as const;
  const counts: Record<string, number> = {};

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) return apiError(error.message, 500);
    counts[table] = count || 0;
  }

  const connectors = await getIntegrationStatuses();
  let followupsToday = 0;
  try {
    followupsToday = await countTodayFollowups(supabase);
  } catch {
    followupsToday = 0;
  }

  return apiSuccess({
    leads: counts.leads,
    followups: counts.followups,
    followupsToday,
    quotations: counts.quotations,
    clients: counts.clients,
    jobs: counts.jobs,
    integrations: getIntegrationSummary(connectors),
  });
}
