import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildTodayFollowupsResponse,
  FOLLOWUP_SELECT,
  isCompletedStatus,
  todayDateString,
  type FollowupRow,
  type TodayFollowupsResponse,
} from "@/lib/followups/query";
import {
  countAccumulatedFollowups,
  filterAccumulatedFollowups,
  normalizeFollowupRows,
  sortFollowups,
} from "@/lib/followups/normalize";

type LeadSnippet = NonNullable<FollowupRow["leads"]>;

async function attachLeadsToFollowups(
  supabase: SupabaseClient,
  rows: FollowupRow[]
): Promise<FollowupRow[]> {
  const leadIds = [
    ...new Set(rows.map((r) => r.lead_id).filter(Boolean)),
  ] as string[];
  if (!leadIds.length) return rows;

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, company_name, contact_person, mobile, status, updated_at")
    .in("id", leadIds);

  if (error || !leads?.length) return rows;

  const leadMap = new Map(leads.map((l) => [l.id, l as LeadSnippet]));
  return rows.map((row) => ({
    ...row,
    leads: row.lead_id ? leadMap.get(row.lead_id) ?? null : null,
  }));
}

async function loadFollowupRows(
  supabase: SupabaseClient,
  options?: { leadId?: string | null }
): Promise<FollowupRow[]> {
  let query = supabase.from("followups").select(FOLLOWUP_SELECT);

  if (options?.leadId) {
    query = query.eq("lead_id", options.leadId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const normalized = normalizeFollowupRows(
    (data as Record<string, unknown>[]) || []
  );
  return sortFollowups(normalized);
}

export async function fetchFollowups(
  supabase: SupabaseClient,
  options?: { leadId?: string | null }
): Promise<FollowupRow[]> {
  const rows = await loadFollowupRows(supabase, options);
  return attachLeadsToFollowups(supabase, rows);
}

export async function fetchTodayFollowups(
  supabase: SupabaseClient,
  today = todayDateString()
): Promise<TodayFollowupsResponse> {
  const allRows = await loadFollowupRows(supabase);
  const accumulated = filterAccumulatedFollowups(allRows, today);
  const rows = await attachLeadsToFollowups(supabase, accumulated);
  return buildTodayFollowupsResponse(rows, today);
}

export async function countTodayFollowups(
  supabase: SupabaseClient,
  today = todayDateString()
): Promise<number> {
  const { data, error } = await supabase.from("followups").select(FOLLOWUP_SELECT);
  if (error) throw new Error(error.message);
  const normalized = normalizeFollowupRows(
    (data as Record<string, unknown>[]) || []
  );
  return countAccumulatedFollowups(normalized, today);
}

export function filterPendingForLead(rows: FollowupRow[]): FollowupRow[] {
  return rows.filter((row) => !isCompletedStatus(row.status));
}
