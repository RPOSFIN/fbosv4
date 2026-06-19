export const GOOGLE_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbyjpnsEUspB5UNosQskuvxWpppeutb1ZBXEXzI0VtjNhBpBObpI9dwSEvigF-VSS66wAw/exec";

export function getGoogleWebappUrl() {
  return GOOGLE_WEBAPP_URL;
}

export function getGoogleSheetId() {
  return process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID ?? "";
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
