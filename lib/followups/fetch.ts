import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildTodayFollowupsResponse,
  FOLLOWUP_SELECT,
  isCompletedStatus,
  todayDateString,
  type FollowupRow,
  type TodayFollowupsResponse,
} from "@/lib/followups/query";

export async function fetchFollowups(
  supabase: SupabaseClient,
  options?: { leadId?: string | null }
): Promise<FollowupRow[]> {
  let query = supabase.from("followups").select(FOLLOWUP_SELECT);

  if (options?.leadId) {
    query = query.eq("lead_id", options.leadId);
  }

  const { data, error } = await query.order("next_followup", {
    ascending: true,
    nullsFirst: false,
  });

  if (error) throw new Error(error.message);
  return (data as FollowupRow[]) || [];
}

export async function fetchTodayFollowups(
  supabase: SupabaseClient,
  today = todayDateString()
): Promise<TodayFollowupsResponse> {
  const { data, error } = await supabase
    .from("followups")
    .select(FOLLOWUP_SELECT)
    .not("status", "ilike", "completed")
    .or(`next_followup.lte.${today},next_followup.is.null`);

  if (error) throw new Error(error.message);
  return buildTodayFollowupsResponse((data as FollowupRow[]) || [], today);
}

export async function countTodayFollowups(
  supabase: SupabaseClient,
  today = todayDateString()
): Promise<number> {
  const { count, error } = await supabase
    .from("followups")
    .select("*", { count: "exact", head: true })
    .not("status", "ilike", "completed")
    .or(`next_followup.lte.${today},next_followup.is.null`);

  if (error) throw new Error(error.message);
  return count || 0;
}

export function filterPendingForLead(rows: FollowupRow[]): FollowupRow[] {
  return rows.filter((row) => !isCompletedStatus(row.status));
}
