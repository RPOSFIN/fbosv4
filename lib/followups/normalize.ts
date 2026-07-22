/**
 * Normalize legacy followups rows to canonical API shape.
 * Production DBs may lack next_followup or use alternate column names.
 */
import type { FollowupRow } from "@/lib/followups/query";

const DATE_KEYS = [
  "next_followup",
  "followup_date",
  "follow_up_date",
  "followup_on",
  "due_date",
  "next_follow_up",
  "next_followup_date",
  "follow_up",
];

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

export function resolveFollowupDate(
  row: Record<string, unknown>
): string | null {
  for (const key of DATE_KEYS) {
    const val = row[key];
    if (val != null && String(val).trim()) {
      return String(val).slice(0, 10);
    }
  }
  for (const [key, val] of Object.entries(row)) {
    const norm = normalizeKey(key);
    if (
      (norm.includes("followup") || norm.includes("follow_up")) &&
      (norm.includes("date") || norm.endsWith("_on"))
    ) {
      if (val != null && String(val).trim()) {
        return String(val).slice(0, 10);
      }
    }
  }
  return null;
}

export function normalizeFollowupRow(
  row: Record<string, unknown>
): FollowupRow {
  const date = resolveFollowupDate(row);
  return {
    id: String(row.id ?? ""),
    lead_id: (row.lead_id as string | null) ?? null,
    company_name: (row.company_name as string | null) ?? null,
    contact_person: (row.contact_person as string | null) ?? null,
    next_followup: date,
    status: (row.status as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  };
}

export function normalizeFollowupRows(
  rows: Record<string, unknown>[]
): FollowupRow[] {
  return rows.map(normalizeFollowupRow);
}

export function filterAccumulatedFollowups(
  rows: FollowupRow[],
  today: string
): FollowupRow[] {
  return rows.filter((row) => {
    const status = (row.status || "").trim().toLowerCase();
    if (status === "completed") return false;
    if (!row.next_followup) return true;
    return row.next_followup <= today;
  });
}

export function sortFollowups(rows: FollowupRow[]): FollowupRow[] {
  return [...rows].sort((a, b) => {
    const ad = a.next_followup || "9999-12-31";
    const bd = b.next_followup || "9999-12-31";
    return ad.localeCompare(bd);
  });
}

export function countAccumulatedFollowups(
  rows: FollowupRow[],
  today: string
): number {
  return filterAccumulatedFollowups(rows, today).length;
}
