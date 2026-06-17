import type { LeadImportRow, LeadRow } from "@/lib/leads/dedupe";

const COMPARE_FIELDS = [
  "company_name",
  "contact_person",
  "mobile",
  "email",
  "status",
  "source",
  "clickup_task_id",
] as const;

function normalizeEmail(email?: string | null): string {
  return (email || "").toLowerCase().trim();
}

function normalizeMobile(mobile?: string | null): string {
  const digits = (mobile || "").replace(/\D/g, "");
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

function fieldValue(
  field: (typeof COMPARE_FIELDS)[number],
  value: string | null | undefined
): string {
  switch (field) {
    case "email":
      return normalizeEmail(value);
    case "mobile":
      return normalizeMobile(value);
    case "company_name":
      return (value || "").toLowerCase().trim();
    case "status":
      return (value || "NEW").toUpperCase().trim();
    default:
      return (value || "").trim();
  }
}

/** True when incoming row matches existing lead on all synced fields. */
export function leadFieldsMatch(existing: LeadRow, incoming: LeadImportRow): boolean {
  for (const field of COMPARE_FIELDS) {
    const oldVal = fieldValue(field, existing[field] as string | null | undefined);
    const newVal = fieldValue(field, incoming[field] as string | null | undefined);
    if (oldVal !== newVal) return false;
  }
  return true;
}

export function getLeadFieldChanges(
  existing: LeadRow,
  incoming: LeadImportRow
): Record<string, { from: unknown; to: unknown }> {
  const changed: Record<string, { from: unknown; to: unknown }> = {};
  for (const field of COMPARE_FIELDS) {
    const oldVal = fieldValue(field, existing[field] as string | null | undefined);
    const newVal = fieldValue(field, incoming[field] as string | null | undefined);
    if (oldVal !== newVal) {
      changed[field] = {
        from: existing[field as keyof LeadRow] ?? null,
        to: incoming[field as keyof LeadImportRow] ?? null,
      };
    }
  }
  return changed;
}

export function leadSnapshot(existing: LeadRow): Record<string, unknown> {
  return {
    company_name: existing.company_name,
    contact_person: existing.contact_person ?? null,
    mobile: existing.mobile ?? null,
    email: existing.email ?? null,
    status: existing.status ?? null,
    source: existing.source ?? null,
    clickup_task_id: existing.clickup_task_id ?? null,
  };
}
