import { getAdminClient } from "@/lib/supabase/admin";

export function normalizeTallyHost(host: string): string {
  return host
    .replace(/^https?:\/\//, "")
    .split(":")[0]
    .trim();
}

export const DEFAULT_TALLY_COMPANY_NAME = "Flexiflair Tech Private Limited";

export function isLocalTallyHost(host: string): boolean {
  const h = normalizeTallyHost(host).toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

export type ResolvedTallyConfig = {
  host: string;
  port: string;
  company: string;
  hostSource: "env" | "db" | "none";
  isCloud: boolean;
};

export async function getResolvedTallyConfig(): Promise<ResolvedTallyConfig> {
  const envHost =
    process.env.TALLY_HOST?.trim() ||
    process.env.TALLY_SERVER_URL?.trim() ||
    "";
  const port = process.env.TALLY_PORT?.trim() || "9000";
  let dbHost = "";
  let dbCompany = "";
  const supabase = getAdminClient();
  if (supabase) {
    const { data } = await supabase
      .from("integrations")
      .select("config")
      .eq("connector_name", "tally")
      .maybeSingle();

    if (data?.config && typeof data.config === "object") {
      const cfg = data.config as Record<string, unknown>;
      dbHost = String(cfg.tallyHost || cfg.host || "").trim();
      dbCompany = String(cfg.company || "").trim();
    }
  }

  const company =
    process.env.TALLY_COMPANY_NAME?.trim() || dbCompany || DEFAULT_TALLY_COMPANY_NAME;

  let host = "";
  let hostSource: ResolvedTallyConfig["hostSource"] = "none";

  if (envHost && !isLocalTallyHost(envHost)) {
    host = normalizeTallyHost(envHost);
    hostSource = "env";
  } else if (dbHost) {
    host = normalizeTallyHost(dbHost);
    hostSource = "db";
  } else if (envHost) {
    host = normalizeTallyHost(envHost);
    hostSource = "env";
  }

  return {
    host,
    port,
    company,
    hostSource,
    isCloud: Boolean(host) && !isLocalTallyHost(host),
  };
}

export function tallyCloudFixSteps(host: string, port: string): string[] {
  const endpoint = host ? `http://${host}:${port}` : `your-cloud-server:${port}`;
  return [
    `Set TALLY_HOST to your Tally Cloud server IP or hostname (not localhost) in .env.local or Integration Hub below`,
    `Ensure Tally Cloud XML gateway is enabled on port ${port}`,
    `Confirm TALLY_COMPANY_NAME matches your company exactly in Tally (F3 → Company Info)`,
    `Test gateway: POST XML to ${endpoint}`,
    "Restart dev server after editing .env.local",
  ];
}
