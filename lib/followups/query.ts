export type FollowupRow = {
  id: string;
  lead_id?: string | null;
  company_name?: string | null;
  contact_person?: string | null;
  next_followup?: string | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  leads?: {
    id: string;
    company_name?: string | null;
    contact_person?: string | null;
    mobile?: string | null;
    status?: string | null;
    updated_at?: string | null;
  } | null;
};

export type FollowupBucket = "overdue" | "today" | "backlog";

export type TodayFollowupItem = FollowupRow & {
  bucket: FollowupBucket;
  lead_name: string;
  last_contact: string | null;
};

export type TodayFollowupsResponse = {
  items: TodayFollowupItem[];
  counts: {
    overdue: number;
    today: number;
    backlog: number;
    total: number;
  };
  date: string;
};

export function todayDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function isCompletedStatus(status?: string | null): boolean {
  return (status || "").trim().toLowerCase() === "completed";
}

export function categorizeFollowup(
  nextFollowup: string | null | undefined,
  today: string
): FollowupBucket | "upcoming" {
  if (!nextFollowup) return "backlog";
  if (nextFollowup < today) return "overdue";
  if (nextFollowup === today) return "today";
  return "upcoming";
}

export function isAccumulatedFollowup(
  row: FollowupRow,
  today: string
): boolean {
  if (isCompletedStatus(row.status)) return false;
  const bucket = categorizeFollowup(row.next_followup, today);
  return bucket === "overdue" || bucket === "today" || bucket === "backlog";
}

function bucketOrder(bucket: FollowupBucket): number {
  if (bucket === "overdue") return 0;
  if (bucket === "today") return 1;
  return 2;
}

export function enrichFollowup(row: FollowupRow, today: string): TodayFollowupItem {
  const bucket = categorizeFollowup(row.next_followup, today);
  const lead = row.leads;
  const leadName =
    lead?.company_name || row.company_name || row.contact_person || "Unknown";
  const lastContact = lead?.updated_at || row.updated_at || row.created_at || null;

  return {
    ...row,
    bucket: bucket === "upcoming" ? "backlog" : bucket,
    lead_name: leadName,
    last_contact: lastContact,
  };
}

export function buildTodayFollowupsResponse(
  rows: FollowupRow[],
  today = todayDateString()
): TodayFollowupsResponse {
  const accumulated = rows.filter((row) => isAccumulatedFollowup(row, today));
  const items = accumulated
    .map((row) => enrichFollowup(row, today))
    .sort((a, b) => {
      const bucketDiff = bucketOrder(a.bucket) - bucketOrder(b.bucket);
      if (bucketDiff !== 0) return bucketDiff;
      if (a.bucket === "overdue") {
        return (a.next_followup || "").localeCompare(b.next_followup || "");
      }
      if (a.bucket === "today") {
        return (a.lead_name || "").localeCompare(b.lead_name || "");
      }
      return (a.updated_at || "").localeCompare(b.updated_at || "");
    });

  const counts = {
    overdue: items.filter((i) => i.bucket === "overdue").length,
    today: items.filter((i) => i.bucket === "today").length,
    backlog: items.filter((i) => i.bucket === "backlog").length,
    total: items.length,
  };

  return { items, counts, date: today };
}

/** Base select without embedded join — FK may be absent on legacy DBs. */
export const FOLLOWUP_SELECT = "*";

import {
  FOLLOWUP_COLS,
  type FollowupDbShape,
} from "@/lib/followups/constants";

/** Map DB rows → app API shape (next_followup, notes). */
export function normalizeFollowupRow(row: FollowupRow): FollowupRow {
  const raw = row as FollowupRow & {
    followup_date?: string | null;
    remarks?: string | null;
  };
  return {
    ...row,
    next_followup: raw.next_followup ?? raw.followup_date ?? null,
    notes: raw.notes ?? raw.remarks ?? null,
  };
}

export function normalizeFollowupRows(rows: FollowupRow[]): FollowupRow[] {
  return rows.map(normalizeFollowupRow);
}

/** Map app API body → DB column names for insert/update. */
export function denormalizeFollowupForWrite(
  body: Record<string, unknown>,
  shape?: FollowupDbShape
): Record<string, unknown> {
  const dateCol = shape?.date ?? FOLLOWUP_COLS.date;
  const notesCol = shape?.notes ?? FOLLOWUP_COLS.notes;
  const legacy = shape?.legacy ?? true;

  const out: Record<string, unknown> = {};

  if (body.lead_id !== undefined) out.lead_id = body.lead_id ?? null;
  if (body.status !== undefined) out.status = body.status;

  const dateValue =
    body.next_followup !== undefined ? body.next_followup : body[dateCol];
  if (dateValue !== undefined) out[dateCol] = dateValue || null;

  const notesValue = body.notes !== undefined ? body.notes : body[notesCol];
  if (notesValue !== undefined) out[notesCol] = notesValue;

  if (!legacy) {
    if (body.company_name !== undefined) out.company_name = body.company_name;
    if (body.contact_person !== undefined) out.contact_person = body.contact_person;
    if (body.created_by !== undefined) out.created_by = body.created_by;
    if (body.updated_by !== undefined) out.updated_by = body.updated_by;
    if (body.updated_at !== undefined) out.updated_at = body.updated_at;
  }

  return out;
}
