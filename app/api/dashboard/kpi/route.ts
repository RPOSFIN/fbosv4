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

export async function GET() {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const dashboard = await getDashboardStatus();
  const counts = dashboard.counts;

  const connectors = await getIntegrationStatuses();
  let followupsToday = 0;
  try {
    const supabase = await getServerSupabase();
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
