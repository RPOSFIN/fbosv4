import { getGoogleSheetId, getGoogleWebappUrl } from "@/lib/google-config";
import type { ConnectorEnvConfig, ConnectorName } from "@/lib/integrations/types";

export function getClickUpConfig(): ConnectorEnvConfig {
  const token = process.env.CLICKUP_API_TOKEN?.trim();
  const teamId = process.env.CLICKUP_TEAM_ID?.trim();
  const spaceId = process.env.CLICKUP_SPACE_ID?.trim();
  const folderId = process.env.CLICKUP_FOLDER_ID?.trim();
  const listId = process.env.CLICKUP_LIST_ID?.trim();
  return {
    configured: Boolean(token),
    details: {
      hasToken: Boolean(token),
      teamId: teamId || "",
      spaceId: spaceId || "",
      folderId: folderId || "",
      listId: listId || "",
    },
  };
}

export function getTallyConfig(): ConnectorEnvConfig {
  const host =
    process.env.TALLY_HOST?.trim() ||
    process.env.TALLY_SERVER_URL?.trim();
  const port = process.env.TALLY_PORT?.trim() || "9007";
  const company = process.env.TALLY_COMPANY_NAME?.trim();
  const isLocal =
    host === "localhost" || host === "127.0.0.1" || host === "::1";
  const cloudHost = host && !isLocal ? host : "";
  return {
    configured: Boolean(cloudHost && company),
    details: {
      host: host || "",
      port,
      company: company || "",
      hasHost: Boolean(cloudHost),
      hasCompany: Boolean(company),
      isCloud: Boolean(cloudHost),
    },
  };
}

export function getGSheetConfig(): ConnectorEnvConfig {
  const url = getGoogleWebappUrl();
  const sheetId = getGoogleSheetId();
  return {
    configured: Boolean(url || sheetId),
    details: {
      webappConfigured: Boolean(url),
      sheetId: sheetId || "",
      csvFallback: Boolean(sheetId),
    },
  };
}

export function getConnectorEnvConfig(name: ConnectorName): ConnectorEnvConfig {
  switch (name) {
    case "gsheet":
      return getGSheetConfig();
    case "clickup":
      return getClickUpConfig();
    case "tally":
      return getTallyConfig();
  }
}
