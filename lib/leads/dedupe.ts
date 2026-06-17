import { getAdminClient } from "@/lib/supabase/admin";
import {
  getLeadFieldChanges,
  leadFieldsMatch,
  leadSnapshot,
} from "@/lib/leads/sync-compare";

export type LeadRow = {
  id: string;
  company_name: string;
  contact_person?: string | null;
  mobile?: string | null;
  email?: string | null;
  status?: string | null;
  source?: string | null;
  clickup_task_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type LeadImportRow = {
  company_name: string;
  contact_person?: string;
  mobile?: string;
  email?: string;
  status?: string;
  source?: string;
  clickup_task_id?: string;
};

export type LeadUpsertResult = {
  leadsImported: number;
  leadsUpdated: number;
  leadsSkipped: number;
  clientsImported: number;
  /** API aliases */
  inserted: number;
  updated: number;
  skipped: number;
};

const PAGE_SIZE = 1000;
const DELETE_CHUNK = 50;
const EXISTING_SELECT_WITH_CLICKUP =
  "id, company_name, contact_person, mobile, email, status, source, clickup_task_id, created_at, updated_at";
const EXISTING_SELECT =
  "id, company_name, contact_person, mobile, email, status, source, created_at, updated_at";

let _hasClickUpCol: boolean | null = null;

async function hasClickUpTaskIdColumn(): Promise<boolean> {
  if (_hasClickUpCol !== null) return _hasClickUpCol;
  const supabase = getAdminClient();
  if (!supabase) return false;
  const { error } = await supabase.from("leads").select("clickup_task_id").limit(1);
  _hasClickUpCol = !error;
  return _hasClickUpCol;
}

function normalizeEmail(email?: string | null): string {
  return (email || "").toLowerCase().trim();
}

function normalizeMobile(mobile?: string | null): string {
  const digits = (mobile || "").replace(/\D/g, "");
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

/** All lookup keys for a lead (mobile, email, company-only). */
export function leadMatchKeys(lead: {
  company_name?: string | null;
  mobile?: string | null;
  email?: string | null;
}): string[] {
  const company = (lead.company_name || "").toLowerCase().trim();
  if (!company) return [];
  const mobile = normalizeMobile(lead.mobile);
  const email = normalizeEmail(lead.email);
  const keys = new Set<string>();
  if (mobile) keys.add(`${company}|${mobile}`);
  if (email) keys.add(`${company}|${email}`);
  if (!mobile && !email) keys.add(company);
  return Array.from(keys);
}

/** Primary dedupe key (company + mobile, else company + email, else company). */
export function leadDedupeKey(lead: {
  company_name?: string | null;
  mobile?: string | null;
  email?: string | null;
}): string {
  return leadMatchKeys(lead)[0] || "";
}

function findExistingLead(
  row: LeadImportRow,
  byKey: Map<string, LeadRow>,
  byCompanyOnly: Map<string, LeadRow>
): LeadRow | undefined {
  for (const key of leadMatchKeys(row)) {
    const hit = byKey.get(key);
    if (hit) return hit;
  }

  const company = (row.company_name || "").toLowerCase().trim();
  if (!company) return undefined;

  const sparse = byCompanyOnly.get(company);
  if (
    sparse &&
    !normalizeMobile(sparse.mobile) &&
    !normalizeEmail(sparse.email)
  ) {
    return sparse;
  }

  return undefined;
}

async function findLeadInDb(row: LeadImportRow): Promise<LeadRow | null> {
  const supabase = getAdminClient();
  if (!supabase) return null;

  const company = (row.company_name || "").trim();
  if (!company) return null;

  const { data } = await supabase
    .from("leads")
    .select("*")
    .ilike("company_name", company)
    .limit(25);

  const rowKeys = new Set(leadMatchKeys(row));
  for (const lead of (data || []) as LeadRow[]) {
    if (leadMatchKeys(lead).some((k) => rowKeys.has(k))) return lead;
    const leadCompany = (lead.company_name || "").toLowerCase().trim();
    if (
      leadCompany === company.toLowerCase().trim() &&
      !normalizeMobile(lead.mobile) &&
      !normalizeEmail(lead.email)
    ) {
      return lead;
    }
  }

  return null;
}

function toUpsertResult(
  leadsImported: number,
  leadsUpdated: number,
  leadsSkipped: number
): LeadUpsertResult {
  return {
    leadsImported,
    leadsUpdated,
    leadsSkipped,
    clientsImported: 0,
    inserted: leadsImported,
    updated: leadsUpdated,
    skipped: leadsSkipped,
  };
}

async function fetchAllLeads(): Promise<Array<Record<string, unknown>>> {
  const supabase = getAdminClient();
  if (!supabase) return [];

  const all: Array<Record<string, unknown>> = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.warn("[leads] fetch page:", error.message);
      break;
    }
    const page = (data || []) as unknown as Array<Record<string, unknown>>;
    if (!page.length) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}

/** Collapse duplicate rows in one sync batch — latest row wins per key. */
function collapseInputRows(rows: LeadImportRow[]): {
  rows: LeadImportRow[];
  skipped: number;
} {
  const byKey = new Map<string, LeadImportRow>();

  for (const row of rows) {
    const key = row.clickup_task_id
      ? `clickup:${row.clickup_task_id}`
      : leadDedupeKey(row);
    if (!key) continue;
    byKey.set(key, row);
  }

  const deduped = Array.from(byKey.values());
  return { rows: deduped, skipped: rows.length - deduped.length };
}

function buildLeadPayload(row: LeadImportRow, includeClickUp: boolean) {
  const payload: Record<string, unknown> = {
    company_name: row.company_name,
    contact_person: row.contact_person ?? null,
    mobile: row.mobile ?? null,
    email: row.email ?? null,
    status: row.status || "NEW",
    source: row.source || "Google Sheets",
  };
  if (includeClickUp && row.clickup_task_id) {
    payload.clickup_task_id = row.clickup_task_id;
  }
  return payload;
}

async function recordLeadHistory(
  leadId: string,
  existing: LeadRow,
  incoming: LeadImportRow,
  changedFields: Record<string, { from: unknown; to: unknown }>
): Promise<void> {
  const supabase = getAdminClient();
  if (!supabase) return;

  const { error } = await supabase.from("lead_history").insert({
    lead_id: leadId,
    changed_fields: changedFields,
    snapshot: leadSnapshot(existing),
    source: incoming.source || "sync",
    synced_at: new Date().toISOString(),
  });

  if (error) {
    console.warn("[leads] history insert:", error.message);
  }
}

export async function dedupeLeads(): Promise<{
  totalBefore: number;
  totalAfter: number;
  removed: number;
}> {
  const supabase = getAdminClient();
  if (!supabase) {
    return { totalBefore: 0, totalAfter: 0, removed: 0 };
  }

  const raw = await fetchAllLeads();

  if (!raw.length) {
    return { totalBefore: 0, totalAfter: 0, removed: 0 };
  }

  const all = raw as LeadRow[];

  const seenByKey = new Map<string, string>();
  const seenByClickUp = new Map<string, string>();
  const toDelete: string[] = [];

  const sorted = [...all].sort((a, b) => {
    const aTs = new Date(
      (a.updated_at as string | undefined) || (a.created_at as string | undefined) || 0
    ).getTime();
    const bTs = new Date(
      (b.updated_at as string | undefined) || (b.created_at as string | undefined) || 0
    ).getTime();
    return bTs - aTs;
  });

  for (const lead of sorted) {
    const key = leadDedupeKey(lead);
    const clickupId = lead.clickup_task_id?.trim();

    let isDuplicate = false;

    if (clickupId) {
      const existing = seenByClickUp.get(clickupId);
      if (existing) isDuplicate = true;
      else seenByClickUp.set(clickupId, lead.id);
    }

    if (!isDuplicate && key) {
      const existing = seenByKey.get(key);
      if (existing) isDuplicate = true;
      else seenByKey.set(key, lead.id);
    }

    if (isDuplicate) toDelete.push(lead.id);
  }

  if (toDelete.length) {
    for (let i = 0; i < toDelete.length; i += DELETE_CHUNK) {
      const chunk = toDelete.slice(i, i + DELETE_CHUNK);
      const { error: delErr } = await supabase.from("leads").delete().in("id", chunk);
      if (delErr) {
        console.warn("[leads] dedupe delete:", delErr.message);
        return { totalBefore: all.length, totalAfter: all.length, removed: 0 };
      }
    }
  }

  return {
    totalBefore: all.length,
    totalAfter: all.length - toDelete.length,
    removed: toDelete.length,
  };
}

export async function importLeadsWithDedupe(
  rows: LeadImportRow[]
): Promise<LeadUpsertResult> {
  const supabase = getAdminClient();
  if (!supabase || rows.length === 0) {
    return toUpsertResult(0, 0, 0);
  }

  const { rows: uniqueRows, skipped: batchSkipped } = collapseInputRows(rows);

  const raw = await fetchAllLeads();
  const existing = raw as LeadRow[];
  const includeClickUp = await hasClickUpTaskIdColumn();

  const byKey = new Map<string, LeadRow>();
  const byCompanyOnly = new Map<string, LeadRow>();
  const byClickUpId = new Map<string, LeadRow>();

  for (const lead of existing) {
    for (const key of leadMatchKeys(lead)) {
      if (!byKey.has(key)) byKey.set(key, lead);
    }
    const company = (lead.company_name || "").toLowerCase().trim();
    if (company && !byCompanyOnly.has(company)) {
      byCompanyOnly.set(company, lead);
    }
    const clickupId = lead.clickup_task_id?.trim();
    if (clickupId && !byClickUpId.has(clickupId)) {
      byClickUpId.set(clickupId, lead);
    }
  }

  const toInsert: LeadImportRow[] = [];
  const toUpdate: Array<{ existing: LeadRow; data: LeadImportRow }> = [];
  let unchangedSkipped = 0;

  for (const row of uniqueRows) {
    let existingLead: LeadRow | undefined;

    if (row.clickup_task_id && includeClickUp) {
      existingLead = byClickUpId.get(row.clickup_task_id);
    }
    if (!existingLead) {
      existingLead = findExistingLead(row, byKey, byCompanyOnly);
    }

    if (existingLead) {
      if (leadFieldsMatch(existingLead, row)) {
        unchangedSkipped++;
      } else {
        toUpdate.push({ existing: existingLead, data: row });
      }
    } else {
      toInsert.push(row);
      for (const key of leadMatchKeys(row)) {
        byKey.set(key, {
          id: "__new__",
          company_name: row.company_name,
          contact_person: row.contact_person,
          mobile: row.mobile,
          email: row.email,
          status: row.status,
          source: row.source,
          clickup_task_id: row.clickup_task_id,
        });
      }
      if (row.clickup_task_id && includeClickUp) {
        byClickUpId.set(row.clickup_task_id, {
          id: "__new__",
          company_name: row.company_name,
          clickup_task_id: row.clickup_task_id,
        });
      }
    }
  }

  let leadsImported = 0;
  let leadsUpdated = 0;

  const confirmedInsert: LeadImportRow[] = [];
  for (const row of toInsert) {
    const dbHit = await findLeadInDb(row);
    if (dbHit) {
      if (leadFieldsMatch(dbHit, row)) unchangedSkipped++;
      else toUpdate.push({ existing: dbHit, data: row });
    } else {
      confirmedInsert.push(row);
    }
  }

  if (confirmedInsert.length) {
    const { data: inserted, error } = await supabase
      .from("leads")
      .insert(confirmedInsert.map((r) => buildLeadPayload(r, includeClickUp)))
      .select("id");

    if (error) {
      console.warn("[leads] insert:", error.message);
    } else {
      leadsImported = inserted?.length || 0;
    }
  }

  for (const { existing: existingLead, data } of toUpdate) {
    const changedFields = getLeadFieldChanges(existingLead, data);
    const { error } = await supabase
      .from("leads")
      .update(buildLeadPayload(data, includeClickUp))
      .eq("id", existingLead.id);

    if (error) {
      console.warn("[leads] update:", error.message);
      continue;
    }

    leadsUpdated++;
    await recordLeadHistory(existingLead.id, existingLead, data, changedFields);
  }

  return toUpsertResult(
    leadsImported,
    leadsUpdated,
    batchSkipped + unchangedSkipped
  );
}

export { leadFieldsMatch } from "@/lib/leads/sync-compare";
