import { apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getDashboardStatus } from "@/lib/dashboard/status";
import { getIntegrationStatuses } from "@/lib/integrations/status";

export async function GET() {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const [dashboard, integrations] = await Promise.all([
    getDashboardStatus(),
    getIntegrationStatuses(),
  ]);

  return apiSuccess({
    metrics: dashboard.finance,
    counts: dashboard.counts,
    integrations: Object.fromEntries(
      integrations.map((integration) => [
        integration.connector_name,
        {
          status: integration.status,
          lastSyncAt: integration.last_sync_at,
          message: integration.error_message,
        },
      ])
    ),
  });
}

