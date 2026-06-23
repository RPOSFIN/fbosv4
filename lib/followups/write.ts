/** Map canonical API date field to DB columns on write (with legacy fallback). */
import type { SupabaseClient } from "@supabase/supabase-js";

export function buildFollowupInsertPayload(input: {
  company_name?: string;
  contact_person?: string;
  lead_id?: string | null;
  next_followup?: string | null;
  status?: string;
  notes?: string;
  created_by?: string;
  updated_by?: string;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    company_name: input.company_name,
    contact_person: input.contact_person,
    lead_id: input.lead_id || null,
    status: input.status || "Pending",
    notes: input.notes,
    created_by: input.created_by,
    updated_by: input.updated_by,
  };
  if (input.next_followup) {
    payload.next_followup = input.next_followup;
  }
  return payload;
}

export function buildFollowupUpdatePayload(input: {
  next_followup?: string | null;
  status?: string;
  notes?: string;
  updated_by?: string;
}): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (input.status !== undefined) updates.status = input.status;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.updated_by) updates.updated_by = input.updated_by;
  if (input.next_followup !== undefined) {
    updates.next_followup = input.next_followup;
  }
  return updates;
}

function isMissingColumnError(message: string, column: string): boolean {
  return message.includes(column) && message.includes("does not exist");
}

export async function insertFollowupRow(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
) {
  let result = await supabase.from("followups").insert([payload]).select().single();
  if (
    result.error &&
    payload.next_followup != null &&
    isMissingColumnError(result.error.message, "next_followup")
  ) {
    const { next_followup, ...rest } = payload;
    result = await supabase
      .from("followups")
      .insert([{ ...rest, followup_date: next_followup }])
      .select()
      .single();
  }
  return result;
}

export async function updateFollowupRow(
  supabase: SupabaseClient,
  id: string,
  updates: Record<string, unknown>
) {
  let result = await supabase
    .from("followups")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (
    result.error &&
    updates.next_followup !== undefined &&
    isMissingColumnError(result.error.message, "next_followup")
  ) {
    const { next_followup, ...rest } = updates;
    result = await supabase
      .from("followups")
      .update({ ...rest, followup_date: next_followup })
      .eq("id", id)
      .select()
      .single();
  }
  return result;
}
