import {
  apiError,
  apiSuccess,
  authorize,
  writeActivityLog,
} from "@/lib/rbac/api-auth";
import { syncGSheetHub } from "@/lib/integrations/gsheet-hub";
import { upsertIntegrationRow } from "@/lib/integrations/status";

export async function POST() {
  const auth = await authorize("integrations", "update");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const result = await syncGSheetHub();
  const now = new Date().toISOString();

  await upsertIntegrationRow({
    connector_name: "gsheet",
    status: result.ok ? "connected" : "error",
    last_sync_at: result.ok ? now : null,
    error_message: result.ok ? null : result.message,
    config: {
      leadsImported: result.leadsImported ?? 0,
      leadsUpdated: result.leadsUpdated ?? 0,
      leadsSkipped: result.leadsSkipped ?? 0,
      operationsImported: result.operationsImported ?? 0,
      financeImported: result.financeImported ?? 0,
      tabsSynced: result.tabsSynced ?? [],
      clientsImported: result.clientsImported ?? 0,
      healthCheck: result.healthCheck ?? false,
      lastMessage: result.message,
      fixSteps: result.fixSteps,
      source: result.source,
    },
  });

  await writeActivityLog({
    entity_type: "integration",
    entity_id: "gsheet",
    action: result.ok ? "sync_success" : "sync_failed",
    user_id: ctx.userId,
    user_name: ctx.fullName || ctx.email,
    notes: result.message,
  });

  if (!result.ok) return apiError(result.message, 502);

  return apiSuccess(result);
}
