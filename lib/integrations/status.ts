import { getAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getConnectorEnvConfig } from "@/lib/integrations/config";
import {
  isLocalTallyHost,
  normalizeTallyHost,
} from "@/lib/integrations/tally-config";
import {
  CONNECTORS,
  type ConnectorName,
  type IntegrationRecord,
  type IntegrationStatus,
} from "@/lib/integrations/types";

const CONNECTOR_LABELS: Record<ConnectorName, string> = {
  gsheet: "Google Sheets",
  clickup: "ClickUp",
  tally: "Tally",
};

const LEGACY_NAME_MAP: Record<string, ConnectorName> = {
  GOOGLE_SHEETS: "gsheet",
  GSHEET: "gsheet",
  CLICKUP: "clickup",
  TALLY: "tally",
  gsheet: "gsheet",
  clickup: "clickup",
  tally: "tally",
};

const LEGACY_STATUS_MAP: Record<string, IntegrationStatus> = {
  ACTIVE: "connected",
  CONNECTED: "connected",
  PENDING: "pending",
  ERROR: "error",
  connected: "connected",
  pending: "pending",
  error: "error",
};

function resolveStatusFromEnv(name: ConnectorName): IntegrationStatus {
  const env = getConnectorEnvConfig(name);
  if (name === "gsheet" && env.configured) return "connected";
  if (env.configured) return "pending";
  return "pending";
}

async function getSupabaseForIntegrations(): Promise<SupabaseClient | null> {
  const admin = getAdminClient();
  if (admin) return admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return null;

  return createSupabaseServerClient();
}

type RawIntegrationRow = Record<string, unknown>;

function normalizeConnectorName(raw: unknown): ConnectorName | null {
  if (typeof raw !== "string") return null;
  const mapped = LEGACY_NAME_MAP[raw] || LEGACY_NAME_MAP[raw.toUpperCase()];
  if (mapped) return mapped;
  if (CONNECTORS.includes(raw as ConnectorName)) return raw as ConnectorName;
  return null;
}

function normalizeStatus(raw: unknown, fallback: IntegrationStatus): IntegrationStatus {
  if (typeof raw !== "string") return fallback;
  return LEGACY_STATUS_MAP[raw] || LEGACY_STATUS_MAP[raw.toUpperCase()] || fallback;
}

function rowToPartial(row: RawIntegrationRow): Partial<IntegrationRecord> {
  const connector_name =
    normalizeConnectorName(row.connector_name) ||
    normalizeConnectorName(row.integration_name);

  if (!connector_name) return {};

  return {
    connector_name,
    status: normalizeStatus(row.status, "pending"),
    config:
      typeof row.config === "object" && row.config
        ? (row.config as Record<string, unknown>)
        : {},
    last_sync_at: (row.last_sync_at as string) ?? null,
    error_message: (row.error_message as string) ?? null,
  };
}

export async function tableExists(): Promise<boolean> {
  const supabase = await getSupabaseForIntegrations();
  if (!supabase) return false;
  const { error } = await supabase
    .from("integrations")
    .select("id", { head: true, count: "exact" });
  return !error;
}

export async function upsertIntegrationRow(input: {
  connector_name: ConnectorName;
  status: IntegrationStatus;
  config?: Record<string, unknown>;
  last_sync_at?: string | null;
  error_message?: string | null;
  demo?: boolean;
}) {
  const exists = await tableExists();
  if (!exists) return;

  const supabase = await getSupabaseForIntegrations();
  if (!supabase) return;
  const envConfig = getConnectorEnvConfig(input.connector_name);

  const payload: Record<string, unknown> = {
    status: input.status === "connected" ? "connected" : input.status,
    config: {
      ...envConfig.details,
      ...(input.config || {}),
      ...(input.demo ? { demo: true } : {}),
    },
    last_sync_at: input.last_sync_at ?? null,
    error_message: input.error_message ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error: modernErr } = await supabase.from("integrations").upsert(
    {
      connector_name: input.connector_name,
      ...payload,
    },
    { onConflict: "connector_name" }
  );

  if (!modernErr) return;

  const legacyName =
    input.connector_name === "gsheet"
      ? "GOOGLE_SHEETS"
      : input.connector_name.toUpperCase();

  const legacyStatus =
    input.status === "connected"
      ? "ACTIVE"
      : input.status === "error"
        ? "ERROR"
        : "PENDING";

  const { data: existing } = await supabase
    .from("integrations")
    .select("id")
    .eq("integration_name", legacyName)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("integrations")
      .update({
        status: legacyStatus,
        config: payload.config,
      })
      .eq("id", existing.id);
    return;
  }

  await supabase.from("integrations").insert({
    integration_name: legacyName,
    status: legacyStatus,
    config: payload.config,
  });
}

function mergeRecord(
  name: ConnectorName,
  row?: Partial<IntegrationRecord>
): IntegrationRecord {
  const env = getConnectorEnvConfig(name);
  const envStatus = resolveStatusFromEnv(name);
  const dbStatus = row?.status;
  const isDemo = Boolean(row?.config?.demo);

  let status: IntegrationStatus = envStatus;
  if (dbStatus === "error") status = "error";
  else if (dbStatus === "connected" || (env.configured && name === "gsheet")) {
    status = "connected";
  } else if (isDemo) {
    status = "connected";
  } else if (name === "tally") {
    const tallyHost = String(
      row?.config?.tallyHost || row?.config?.host || env.details.host || ""
    );
    const company = String(row?.config?.company || env.details.company || "");
    const cloudHost =
      tallyHost && !isLocalTallyHost(normalizeTallyHost(tallyHost));
    if (cloudHost && company) status = dbStatus === "pending" ? "pending" : "connected";
    else if (!cloudHost) status = "pending";
  } else if (!env.configured && name !== "gsheet") {
    status = "pending";
  } else if (dbStatus) {
    status = dbStatus;
  }

  const mergedConfig = {
    label: CONNECTOR_LABELS[name],
    ...env.details,
    ...(row?.config || {}),
    ...(name === "tally" && env.details.company
      ? { company: env.details.company }
      : {}),
  };

  return {
    connector_name: name,
    status,
    config: mergedConfig,
    last_sync_at: row?.last_sync_at ?? null,
    error_message: row?.error_message ?? null,
    demo: isDemo,
  };
}

export async function getIntegrationStatuses(): Promise<IntegrationRecord[]> {
  const exists = await tableExists();
  const rowsByName = new Map<ConnectorName, Partial<IntegrationRecord>>();

  if (exists) {
    const supabase = await getSupabaseForIntegrations();
    if (supabase) {
      const { data } = await supabase.from("integrations").select("*");
      for (const row of data || []) {
        const partial = rowToPartial(row as RawIntegrationRow);
        if (partial.connector_name) {
          rowsByName.set(partial.connector_name, partial);
        }
      }
    }
  }

  return CONNECTORS.map((name) => mergeRecord(name, rowsByName.get(name)));
}

export function getIntegrationSummary(records: IntegrationRecord[]) {
  const withDemo = records.map((r) => ({
    ...r,
    displayStatus:
      r.demo && r.status !== "error"
        ? ("demo" as const)
        : r.status,
  }));

  return {
    gsheet: records.find((r) => r.connector_name === "gsheet")?.status ?? "pending",
    clickup:
      withDemo.find((r) => r.connector_name === "clickup")?.displayStatus ?? "pending",
    tally:
      withDemo.find((r) => r.connector_name === "tally")?.displayStatus ?? "pending",
    connected: records.filter((r) => r.status === "connected").length,
    pending: records.filter((r) => r.status === "pending").length,
    error: records.filter((r) => r.status === "error").length,
    demo: records.filter((r) => r.demo).length,
  };
}
