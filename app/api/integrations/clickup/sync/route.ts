import { NextResponse } from "next/server";
import {
  apiError,
  apiSuccess,
  authorize,
  writeActivityLog,
} from "@/lib/rbac/api-auth";
import { runClickUpSync } from "@/lib/services/clickup-sync-service";
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
  const result = await runClickUpSync();
  const now = new Date().toISOString();
  const connected = result.ok && !result.demo && Boolean(result.tasksStored || result.leadsSynced);

  await upsertIntegrationRow({
    connector_name: "clickup",
    status: connected ? "connected" : result.ok ? "pending" : "error",
    last_sync_at: connected ? now : null,
    error_message: connected ? null : result.message,
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
    action: connected ? "sync_success" : "sync_failed",
    user_id: ctx.userId,
    user_name: ctx.fullName || ctx.email,
    notes: result.message,
  });

  if (!result.ok) return apiError(result.message, 502);

  const syncData = await loadIntegrationSyncData();
  return apiSuccess({ ...result, connected, syncData });
}
