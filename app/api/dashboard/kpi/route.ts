import {
  apiSuccess,
  authorize,
  getServerSupabase,
} from "@/lib/rbac/api-auth";
import {
  getIntegrationStatuses,
  getIntegrationSummary,
} from "@/lib/integrations/status";
import { countTodayFollowups } from "@/lib/followups/fetch";
import { getDashboardStatus } from "@/lib/dashboard/status";
import { getLeadStats } from "@/lib/services/lead-service";

export async function GET() {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const [dashboard, leadStats, connectors] = await Promise.all([
    getDashboardStatus(),
    getLeadStats(),
    getIntegrationStatuses(),
  ]);

  let followupsToday = 0;
  try {
    const supabase = await getServerSupabase();
    followupsToday = await countTodayFollowups(supabase);
  } catch {
    followupsToday = 0;
  }

  return apiSuccess({
    leads: leadStats.total,
    won: leadStats.won,
    active: leadStats.active,
    followups: dashboard.counts.followups,
    followupsToday,
    quotations: dashboard.counts.quotations,
    clients: dashboard.counts.clients,
    jobs: dashboard.counts.jobs,
    integrations: getIntegrationSummary(connectors),
  });
}
