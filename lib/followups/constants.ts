/** LIVE legacy schema (eahojgogyrgoelqevbvq). */
export const FOLLOWUP_COLS = {
  date: "followup_date",
  notes: "remarks",
} as const;

export type FollowupDateColumn = "next_followup" | "followup_date";
export type FollowupNotesColumn = "notes" | "remarks";

export type FollowupDbShape = {
  date: FollowupDateColumn;
  notes: FollowupNotesColumn;
  /** Legacy DBs omit company_name, contact_person, created_by, updated_by, updated_at. */
  legacy: boolean;
};

let cachedDbShape: FollowupDbShape | null = null;

/** Detect column names once per process (LIVE vs fbosv4). */
export async function resolveFollowupDbShape(
  supabase: { from: (table: string) => { select: (cols: string) => { limit: (n: number) => Promise<{ error: { message?: string } | null }> } } }
): Promise<FollowupDbShape> {
  if (cachedDbShape) return cachedDbShape;

  const { error } = await supabase.from("followups").select("next_followup").limit(0);

  if (
    error?.message?.includes("next_followup") &&
    error.message.includes("does not exist")
  ) {
    cachedDbShape = {
      date: FOLLOWUP_COLS.date,
      notes: FOLLOWUP_COLS.notes,
      legacy: true,
    };
  } else {
    cachedDbShape = {
      date: "next_followup",
      notes: "notes",
      legacy: false,
    };
  }

  return cachedDbShape;
}
