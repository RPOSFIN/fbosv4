import {
  apiError,
  apiSuccess,
  authorize,
  writeActivityLog,
} from "@/lib/rbac/api-auth";
import { syncTally } from "@/lib/integrations/tally";
import { upsertIntegrationRow } from "@/lib/integrations/status";

export async function POST() {
  const auth = await authorize("integrations", "update");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const result = await syncTally();
  const now = new Date().toISOString();

  await upsertIntegrationRow({
    connector_name: "tally",
    status: result.ok ? "connected" : "error",
    last_sync_at: result.ok ? now : null,
    error_message: result.ok ? null : result.message,
    demo: result.demo,
    config: {
      endpoint: result.endpoint,
      demo: result.demo,
      recordsQueued: result.recordsQueued,
      preview: result.preview,
      lastMessage: result.message,
      fixSteps: result.fixSteps,
    },
  });

  await writeActivityLog({
    entity_type: "integration",
    entity_id: "tally",
    action: result.ok ? "sync_success" : "sync_failed",
    user_id: ctx.userId,
    user_name: ctx.fullName || ctx.email,
    notes: result.message,
  });

  if (!result.ok) return apiError(result.message, 502);

  return apiSuccess(result);
}
