import { CLICKUP_LEAD_STATUSES } from "@/lib/integrations/lead-crm-schema";
import { importLeadsWithDedupe, type LeadUpsertResult } from "@/lib/leads/dedupe";
import { getAdminClient } from "@/lib/supabase/admin";

export type ClickUpLeadTask = {
  id: string;
  name: string;
  status?: string;
  mobile?: string;
  assignee?: string;
  priority?: string;
  due_date?: string;
  comments?: string;
  start_date?: string;
};

export async function syncClickUpTasksToLeads(
  tasks: ClickUpLeadTask[]
): Promise<LeadUpsertResult> {
  if (!tasks.length) {
    return {
      leadsImported: 0,
      leadsUpdated: 0,
      leadsSkipped: 0,
      clientsImported: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
    };
  }

  const rows = tasks
    .filter((t) => t.name?.trim())
    .map((t) => ({
      company_name: t.name.trim(),
      contact_person: undefined as string | undefined,
      mobile: t.mobile?.trim() || undefined,
      email: undefined as string | undefined,
      status: mapClickUpStatusToLead(t.status),
      source: "ClickUp",
      clickup_task_id: t.id,
    }));

  return importLeadsWithDedupe(rows);
}

export function normalizeClickUpSalesStatus(status?: string): string {
  if (!status) return "NEW";
  const s = status.trim().toUpperCase().replace(/\s+/g, " ");

  const map: Record<string, string> = {
    "NEW": "NEW",
    "BACKLOG": "NEW",
    "PLANNING": "QUALIFIED",
    "READY FOR REVIEW": "QUALIFIED",
    "QUALIFIED": "QUALIFIED",
    "CONTACTED": "CONTACTED",
    "IN PROGRESS": "CONTACTED",
    "DETAILS SHARED": "DETAILS_SHARED",
    "BACK CALL": "FOLLOWUP_SCHEDULED",
    "CONNECT IN FUTURE": "FOLLOWUP_SCHEDULED",
    "NOT CONNECTED": "NOT_CONNECTED",
    "QUOTED": "QUOATED",
    "QUOATED": "QUOATED",
    "NEGOTATION": "NEGOTIATION",
    "NEGOTIATION": "NEGOTIATION",
    "WON": "WON",
    "LOST": "LOST",
    "NOT INTERESTED/REQUIRED": "NOT_INTERESTED",
    "NOT INTERESTED": "NOT_INTERESTED",
    "DORMANT": "DORMANT",
  };

  if (map[s]) return map[s];
  if (s.includes("WON")) return "WON";
  if (s.includes("LOST")) return "LOST";
  if (s.includes("NOT INTERESTED")) return "NOT_INTERESTED";
  if (s.includes("NOT CONNECT")) return "NOT_CONNECTED";
  if (s.includes("BACK CALL") || s.includes("FOLLOW")) return "FOLLOWUP_SCHEDULED";
  if (s.includes("FUTURE")) return "FOLLOWUP_SCHEDULED";
  if (s.includes("DETAIL")) return "DETAILS_SHARED";
  if (s.includes("NEGOTIAT") || s.includes("NEGOTAT")) return "NEGOTIATION";
  if (s.includes("QUOAT") || s.includes("QUOT")) return "QUOATED";
  if (s.includes("QUALIF") || s.includes("REVIEW")) return "QUALIFIED";
  if (s.includes("CONTACT") || s.includes("PROGRESS")) return "CONTACTED";
  return "NEW";
}

/** Keep pipeline statuses; normalize QUOTED → QUOATED to match existing CRM status spelling. */
export function mapClickUpStatusToLead(status?: string): string {
  const normalized = normalizeClickUpSalesStatus(status);
  if ((CLICKUP_LEAD_STATUSES as readonly string[]).includes(normalized)) return normalized;

  // Internal SalesOS-only statuses should not corrupt the existing CRM enum yet.
  if (normalized === "DETAILS_SHARED") return "CONTACTED";
  if (normalized === "FOLLOWUP_SCHEDULED") return "CONTACTED";
  if (normalized === "NOT_CONNECTED") return "CONTACTED";
  if (normalized === "NOT_INTERESTED") return "LOST";
  if (normalized === "DORMANT") return "LOST";

  return "NEW";
}

export async function getClickUpTasksForSales(limit = 50, status?: string) {
  const supabase = getAdminClient();
  if (!supabase) return [];

  let query = supabase
    .from("clickup_tasks")
    .select("id, external_id, name, status, list_name, space_name, synced_at")
    .order("synced_at", { ascending: false })
    .limit(limit);

  if (status) query = query.ilike("status", status);

  const { data, error } = await query;
  if (error) return [];
  return (data || []).map((task) => ({
    ...task,
    normalized_status: normalizeClickUpSalesStatus(task.status || undefined),
  }));
}
