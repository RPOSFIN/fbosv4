import {
  getClickUpConfig,
  getGSheetConfig,
  getTallyConfig,
} from "@/lib/integrations/config";

export function maskSecret(value: string | undefined, visible = 4): string {
  if (!value) return "—";
  const trimmed = value.trim();
  if (trimmed.length <= visible) return "••••";
  return `${"•".repeat(Math.min(8, trimmed.length - visible))}${trimmed.slice(-visible)}`;
}

function maskUrl(url: string | undefined): string {
  if (!url) return "—";
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/");
    const last = pathParts[pathParts.length - 1] || "exec";
    return `${parsed.origin}/…/${last.slice(0, 6)}…`;
  } catch {
    return maskSecret(url, 6);
  }
}

export function getMaskedIntegrationConfig() {
  const gsheet = getGSheetConfig();
  const clickup = getClickUpConfig();
  const tally = getTallyConfig();

  return {
    authDisabled:
      process.env.NEXT_PUBLIC_AUTH_DISABLED === "true" ||
      process.env.FBOS_AUTH_DISABLED === "true",
    connectors: {
      gsheet: {
        configured: gsheet.configured,
        webappUrl: maskUrl(process.env.GOOGLE_WEBAPP_URL || process.env.GOOGLE_SHEETS_WEBAPP_URL),
        sheetId: process.env.GOOGLE_SHEET_ID?.trim() || process.env.GOOGLE_SHEETS_ID?.trim() || "—",
        csvUrl: maskUrl(process.env.GSHEET_CSV_URL),
      },
      clickup: {
        configured: clickup.configured,
        token: maskSecret(process.env.CLICKUP_API_TOKEN),
        teamId: process.env.CLICKUP_TEAM_ID?.trim() || "(auto: first team)",
        spaceId: process.env.CLICKUP_SPACE_ID?.trim() || "—",
        folderId: process.env.CLICKUP_FOLDER_ID?.trim() || "—",
        listId: process.env.CLICKUP_LIST_ID?.trim() || "—",
      },
      tally: {
        configured: tally.configured,
        host: process.env.TALLY_HOST || process.env.TALLY_SERVER_URL || "—",
        port: process.env.TALLY_PORT?.trim() || "9007",
        company: maskSecret(process.env.TALLY_COMPANY_NAME?.trim(), 6) || "—",
      },
    },
  };
}
