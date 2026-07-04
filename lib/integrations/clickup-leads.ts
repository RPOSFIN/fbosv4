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

/** Keep pipeline statuses; normalize QUOTED → QUOATED to match existing CRM status spelling. */
export function mapClickUpStatusToLead(status?: string): string {
  if (!status) return "NEW";
  const s = status.trim().toUpperCase().replace(/\s+/g, " ");
  if (s === "QUOTED") return "QUOATED";
  if ((CLICKUP_LEAD_STATUSES as readonly string[]).includes(s)) return s;
  if (s.includes("WON")) return "WON";
  if (s.includes("LOST")) return "LOST";
  if (s.includes("NEGOTIAT")) return "NEGOTIATION";
  if (s.includes("QUOAT") || s.includes("QUOT")) return "QUOATED";
  if (s.includes("QUALIF")) return "QUALIFIED";
  if (s.includes("CONTACT")) return "CONTACTED";
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
  return data || [];
}
