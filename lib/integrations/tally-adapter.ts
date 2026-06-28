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
};

export async function getTallyAdapterStatus(): Promise<TallyAdapterStatus> {
  const config = tallyClient.getConfig();
  if (!config) {
    return {
      mode: "unconfigured",
      host: null,
      port: null,
      company: null,
      available: false,
    };
  }

  if (isLocalTallyHost(config.host) && !allowLocalTally()) {
    return {
      mode: "bypass",
      host: config.host,
      port: config.port,
      company: config.companyName,
      available: false,
    };
  }

  const test = await tallyClient.testConnection();
  if (test.success) {
    return {
      mode: "active",
      host: config.host,
      port: config.port,
      company: config.companyName,
      available: true,
    };
  }

  return {
    mode: "bypass",
    host: config.host,
    port: config.port,
    company: config.companyName,
    available: false,
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
    endpoint: result.endpoint ?? `http://${resolved.host}:${resolved.port}`,
  };
}

export const tallyAdapter = {
  getStatus: getTallyAdapterStatus,
  syncPending: syncTallyPending,
};
