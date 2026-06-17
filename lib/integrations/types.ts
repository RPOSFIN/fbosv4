export const CONNECTORS = ["gsheet", "clickup", "tally"] as const;

export type ConnectorName = (typeof CONNECTORS)[number];

export type IntegrationStatus = "connected" | "pending" | "error";

export type IntegrationDisplayStatus = IntegrationStatus | "demo";

export type IntegrationRecord = {
  connector_name: ConnectorName;
  status: IntegrationStatus;
  config: Record<string, unknown>;
  last_sync_at: string | null;
  error_message: string | null;
  demo?: boolean;
};

export type ConnectorEnvConfig = {
  configured: boolean;
  details: Record<string, string | boolean>;
};
