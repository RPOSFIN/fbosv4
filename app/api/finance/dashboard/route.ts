import { apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getIntegrationStatuses } from "@/lib/integrations/status";
import { getFinanceDashboardData } from "@/lib/services/finance-service";

export async function GET() {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const integrations = await getIntegrationStatuses();
  const payload = await getFinanceDashboardData(integrations);

  return apiSuccess(payload);
}
