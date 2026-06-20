import { apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { loadIntegrationSyncData } from "@/lib/integrations/sync-data";
import { getIntegrationStatuses } from "@/lib/integrations/status";

export async function GET() {
  const auth = await authorize("integrations", "read");
  if ("error" in auth) return auth.error;

  const [syncData, connectors] = await Promise.all([
    loadIntegrationSyncData(),
    getIntegrationStatuses(),
  ]);

  return apiSuccess({ syncData, connectors });
}
