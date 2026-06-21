const DEFAULT_GOOGLE_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzqkpY-z-fuXhdHp6s1sn090ZuqWzU1x7CbGC1hciDKUPqvmQFHKhQ6HM9P4U1pBBa6iw/exec";

export function getGoogleWebappUrl() {
  return (
    process.env.GOOGLE_WEBAPP_URL?.trim() ||
    process.env.GOOGLE_SHEETS_WEBAPP_URL?.trim() ||
    DEFAULT_GOOGLE_WEBAPP_URL
  );
}

export function getGoogleSheetId() {
  return (
    process.env.GOOGLE_SHEET_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID?.trim() ||
    ""
  );
}

export function getSheetTabGids() {
  return {
    leads: "",
    clients: "",
    quotations: "",
    jobs: "",
    followups: "",
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

export function getGSheetFixSteps() {
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
