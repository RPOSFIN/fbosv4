/** Fallback when env is unset (local dev only). Prefer GOOGLE_WEBAPP_URL in .env.local */
export const GOOGLE_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbyjpnsEUspB5UNosQskuvxWpppeutb1ZBXEXzI0VtjNhBpBObpI9dwSEvigF-VSS66wAw/exec";

function envTrim(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

export function getGoogleWebappUrl() {
  return (
    envTrim("GOOGLE_WEBAPP_URL", "GOOGLE_SHEETS_WEBAPP_URL") || GOOGLE_WEBAPP_URL
  );
}

export function getGoogleSheetId() {
  return envTrim(
    "GOOGLE_SHEET_ID",
    "GOOGLE_SHEETS_ID",
    "NEXT_PUBLIC_GOOGLE_SHEET_ID"
  );
}

export type ResolvedGid = { gid: string; source: string };

const OPERATIONS_GID_KEYS = [
  "GOOGLE_SHEET_GID_OPERATIONS",
  "GOOGLE_SHEET_GID_ORDERS",
  "GOOGLE_SHEET_GID_JOBS",
] as const;

/** Resolve 02_Order_Master / operations tab GID with env var precedence. */
export function getOperationsGidCandidates(): ResolvedGid[] {
  const seen = new Set<string>();
  const out: ResolvedGid[] = [];
  for (const key of OPERATIONS_GID_KEYS) {
    const gid = process.env[key]?.trim();
    if (gid && !seen.has(gid)) {
      seen.add(gid);
      out.push({ gid, source: key });
    }
  }
  return out;
}

export function resolveOperationsGid(): ResolvedGid {
  return getOperationsGidCandidates()[0] ?? { gid: "", source: "" };
}

export function getSheetTabGids() {
  const fallback = envTrim("GOOGLE_SHEET_GID");
  const ops = resolveOperationsGid();
  return {
    leads: envTrim("GOOGLE_SHEET_GID_LEADS", "GOOGLE_SHEET_GID") || fallback,
    clients: envTrim("GOOGLE_SHEET_GID_CLIENTS"),
    quotations: envTrim("GOOGLE_SHEET_GID_QUOTATIONS"),
    jobs:
      envTrim(
        "GOOGLE_SHEET_GID_JOBS",
        "GOOGLE_SHEET_GID_ORDERS",
        "GOOGLE_SHEET_GID_OPERATIONS"
      ) || ops.gid,
    followups: envTrim("GOOGLE_SHEET_GID_FOLLOWUPS"),
    operations: ops.gid,
    finance: envTrim("GOOGLE_SHEET_GID_FINANCE", "GOOGLE_SHEET_GID"),
  };
}

export function getGSheetCsvUrl() {
  const sheetId = getGoogleSheetId();
  return sheetId
    ? `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
    : "";
}

export function getGSheetCsvUrlForGid(gid: string) {
  const sheetId = getGoogleSheetId();
  return sheetId
    ? `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
    : "";
}

export function getGSheetFixSteps(_lastStatus?: number) {
  return [
    "Verify Google Sheet ID",
    "Verify Sheet Sharing",
    "Verify Web App URL",
    "Verify Tab GID Mapping",
  ];
}

export function isExplicitWebappUrl(url?: string | null) {
  return !!url && url.startsWith("https://script.google.com/");
}
