/**
 * ClickUp normalization pipeline
 *
 * ClickUp API → clickup_tasks (staging) → mapper → leads (source of truth)
 *
 * Dashboards and sales modules must read from `leads` only — never clickup_tasks.
 */

import {
  syncClickUp,
  type ClickUpSyncResult,
} from "@/lib/integrations/clickup";
import {
  mapClickUpStatusToLead,
  syncClickUpTasksToLeads,
  type ClickUpLeadTask,
} from "@/lib/integrations/clickup-leads";

export type { ClickUpSyncResult, ClickUpLeadTask };

export { mapClickUpStatusToLead, syncClickUpTasksToLeads };

/**
 * Full ClickUp sync: pull tasks, store in clickup_tasks, map and upsert into leads.
 */
export async function runClickUpSync(): Promise<ClickUpSyncResult> {
  return syncClickUp();
}
