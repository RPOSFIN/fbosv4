/** Fallback when env is unset (local dev only). Prefer GOOGLE_WEBAPP_URL in .env.local */
export const GOOGLE_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzqkpY-z-fuXhdHp6s1sn090ZuqWzU1x7CbGC1hciDKUPqvmQFHKhQ6HM9P4U1pBBa6iw/exec";

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

export function getSheetTabGids() {
  const fallback = envTrim("GOOGLE_SHEET_GID");
  return {
    leads: envTrim("GOOGLE_SHEET_GID_LEADS", "GOOGLE_SHEET_GID") || fallback,
    clients: envTrim("GOOGLE_SHEET_GID_CLIENTS"),
    quotations: envTrim("GOOGLE_SHEET_GID_QUOTATIONS", "GOOGLE_SHEET_GID_ORDERS"),
    jobs: envTrim("GOOGLE_SHEET_GID_JOBS", "GOOGLE_SHEET_GID_OPERATIONS"),
    followups: envTrim("GOOGLE_SHEET_GID_FOLLOWUPS"),
    operations: envTrim("GOOGLE_SHEET_GID_OPERATIONS", "GOOGLE_SHEET_GID_JOBS"),
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

export function getGSheetFixSteps(lastStatus?: number) {
  return [
    "Verify Google Sheet ID",
    "Verify Sheet Sharing",
    "Verify Web App URL",
    "Verify Tab GID Mapping",
    ...(lastStatus ? [`Last Google response status: ${lastStatus}`] : []),
  ];
}

export function isExplicitWebappUrl(url?: string | null) {
  return !!url && url.startsWith("https://script.google.com/");
}
