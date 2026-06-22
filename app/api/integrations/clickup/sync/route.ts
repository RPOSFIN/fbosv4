import { NextResponse } from "next/server";
import {
  apiError,
  apiSuccess,
  authorize,
  writeActivityLog,
} from "@/lib/rbac/api-auth";
import { syncClickUp } from "@/lib/integrations/clickup";
import { loadIntegrationSyncData } from "@/lib/integrations/sync-data";
import { upsertIntegrationRow } from "@/lib/integrations/status";

export async function GET() {
  const syncData = await loadIntegrationSyncData();
  return NextResponse.json({ syncData });
}

export async function POST() {
  const auth = await authorize("integrations", "update");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const result = await syncClickUp();
  const now = new Date().toISOString();

  await upsertIntegrationRow({
    connector_name: "clickup",
    status: result.ok ? "connected" : "error",
    last_sync_at: result.ok ? now : null,
    error_message: result.ok ? null : result.message,
    demo: result.demo,
    config: {
      demo: result.demo,
      tasksStored: result.tasksStored ?? 0,
      leadsImported: result.leadsImported ?? 0,
      leadsUpdated: result.leadsUpdated ?? 0,
      leadsSkipped: result.leadsSkipped ?? 0,
      leadsSynced: result.leadsSynced ?? 0,
      lastMessage: result.message,
    },
  });

  await writeActivityLog({
    entity_type: "integration",
    entity_id: "clickup",
    action: result.ok ? "sync_success" : "sync_failed",
    user_id: ctx.userId,
    user_name: ctx.fullName || ctx.email,
    notes: result.message,
  });

  if (!result.ok) return apiError(result.message, 502);

  const syncData = await loadIntegrationSyncData();
  return apiSuccess({ ...result, syncData });
}
