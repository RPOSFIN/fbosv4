import {
  apiSuccess,
  authorize,
  writeActivityLog,
} from "@/lib/rbac/api-auth";
import { syncClickUp } from "@/lib/integrations/clickup";
import { syncGSheetHub } from "@/lib/integrations/gsheet-hub";
import { HUB_SYNC_ORDER } from "@/lib/integrations/hub-route";
import { syncTally } from "@/lib/integrations/tally";
import { upsertIntegrationRow } from "@/lib/integrations/status";

export async function POST() {
  const auth = await authorize("integrations", "update");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const now = new Date().toISOString();
  const results: Record<
    string,
    { ok: boolean; message: string; demo?: boolean }
  > = {};

  // Hub order: Tally → Sheet, ClickUp → Sales, GSheet → full pull
  for (const step of HUB_SYNC_ORDER) {
    if (step === "tally") {
      const tally = await syncTally();
      results.tally = {
        ok: tally.ok,
        message: tally.message,
        demo: tally.demo,
      };
      await upsertIntegrationRow({
        connector_name: "tally",
        status: tally.ok ? "connected" : "error",
        last_sync_at: tally.ok ? now : null,
        error_message: tally.ok ? null : tally.message,
        demo: tally.demo,
        config: {
          demo: tally.demo,
          recordsQueued: tally.recordsQueued ?? 0,
          lastMessage: tally.message,
        },
      });
    }

    if (step === "clickup") {
      const clickup = await syncClickUp();
      results.clickup = {
        ok: clickup.ok,
        message: clickup.message,
        demo: clickup.demo,
      };
      await upsertIntegrationRow({
        connector_name: "clickup",
        status: clickup.ok ? "connected" : "error",
        last_sync_at: clickup.ok ? now : null,
        error_message: clickup.ok ? null : clickup.message,
        demo: clickup.demo,
        config: {
          demo: clickup.demo,
          tasksStored: clickup.tasksStored ?? 0,
          leadsImported: clickup.leadsImported ?? 0,
          leadsUpdated: clickup.leadsUpdated ?? 0,
          leadsSkipped: clickup.leadsSkipped ?? 0,
          leadsSynced: clickup.leadsSynced ?? 0,
          lastMessage: clickup.message,
        },
      });
    }

    if (step === "gsheet") {
      const gsheet = await syncGSheetHub();
      results.gsheet = { ok: gsheet.ok, message: gsheet.message };
      await upsertIntegrationRow({
        connector_name: "gsheet",
        status: gsheet.ok ? "connected" : "error",
        last_sync_at: gsheet.ok ? now : null,
        error_message: gsheet.ok ? null : gsheet.message,
        config: {
          leadsImported: gsheet.leadsImported ?? 0,
          leadsUpdated: gsheet.leadsUpdated ?? 0,
          leadsSkipped: gsheet.leadsSkipped ?? 0,
          operationsImported: gsheet.operationsImported ?? 0,
          financeImported: gsheet.financeImported ?? 0,
          tabsSynced: gsheet.tabsSynced ?? [],
          lastMessage: gsheet.message,
        },
      });
    }
  }

  const allOk =
    results.gsheet?.ok && results.clickup?.ok && results.tally?.ok;

  await writeActivityLog({
    entity_type: "integration",
    entity_id: "sync-all",
    action: allOk ? "sync_all_success" : "sync_all_partial",
    user_id: ctx.userId,
    user_name: ctx.fullName || ctx.email,
    notes: Object.entries(results)
      .map(([k, v]) => `${k}: ${v.message}`)
      .join(" | "),
  });

  return apiSuccess({
    syncedAt: now,
    allOk,
    hubOrder: HUB_SYNC_ORDER,
    results,
  });
}
