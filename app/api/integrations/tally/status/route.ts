import { apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getTallyConfig } from "@/lib/integrations/config";
import { getResolvedTallyConfig } from "@/lib/integrations/tally-config";

export async function GET() {
  const auth = await authorize("integrations", "read");
  if ("error" in auth) return auth.error;

  const env = getTallyConfig();
  const resolved = await getResolvedTallyConfig();

  return apiSuccess({
    connector: "tally",
    configured: env.configured,
    demoMode: !env.configured,
    env: env.details,
    resolved: {
      host: resolved.host,
      port: resolved.port,
      company: resolved.company,
      hostSource: resolved.hostSource,
      isCloud: resolved.isCloud,
      endpoint: resolved.host
        ? `http://${resolved.host}:${resolved.port}`
        : null,
    },
    architecture: {
      server: "WSIPL-89-72",
      gatewayPort: 9007,
      tsPlusNote: "On cloud server use 127.0.0.1:9007; from dev PC use server hostname/IP",
    },
  });
}
