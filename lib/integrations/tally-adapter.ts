import { syncTally } from "@/lib/integrations/tally";
import {
  allowLocalTally,
  getResolvedTallyConfig,
  isLocalTallyHost,
} from "@/lib/integrations/tally-config";
import { tallyClient } from "@/lib/integrations/tally-client";

export type TallyAdapterStatus = {
  mode: "active" | "bypass" | "unconfigured";
  host: string | null;
  port: number | null;
  company: string | null;
  available: boolean;
  source?: "env" | "db" | "none";
  reason?: string;
};

export async function getTallyAdapterStatus(): Promise<TallyAdapterStatus> {
  const resolved = await getResolvedTallyConfig();
  const config = await tallyClient.getResolvedConfig();

  if (!config) {
    return {
      mode: "unconfigured",
      host: null,
      port: null,
      company: resolved.company || null,
      available: false,
      source: resolved.hostSource,
      reason: "Tally host is not configured",
    };
  }

  if (isLocalTallyHost(config.host) && !allowLocalTally()) {
    return {
      mode: "bypass",
      host: config.host,
      port: config.port,
      company: config.companyName,
      available: false,
      source: resolved.hostSource,
      reason: "Local Tally host is blocked unless TALLY_ALLOW_LOCAL=true",
    };
  }

  const test = await tallyClient.testConnection(config);
  if (test.success) {
    return {
      mode: "active",
      host: config.host,
      port: config.port,
      company: config.companyName,
      available: true,
      source: resolved.hostSource,
    };
  }

  return {
    mode: "bypass",
    host: config.host,
    port: config.port,
    company: config.companyName,
    available: false,
    source: resolved.hostSource,
    reason: test.error || "Tally gateway test failed",
  };
}

export async function syncTallyPending() {
  const result = await syncTally();
  const resolved = await getResolvedTallyConfig();
  return {
    synced: result.recordsQueued ?? 0,
    failed: result.ok ? 0 : 1,
    demo: result.demo,
    message: result.message,
    endpoint: result.endpoint ?? (resolved.host ? `http://${resolved.host}:${resolved.port}` : null),
  };
}

export const tallyAdapter = {
  getStatus: getTallyAdapterStatus,
  syncPending: syncTallyPending,
};
