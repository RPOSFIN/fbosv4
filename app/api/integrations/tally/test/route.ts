import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { testTallyGateway } from "@/lib/integrations/tally-gateway";
import { getResolvedTallyConfig } from "@/lib/integrations/tally-config";

export async function POST(request: Request) {
  const auth = await authorize("integrations", "update");
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const resolved = await getResolvedTallyConfig();

  const host = String(body.host || resolved.host || "").trim();
  const port = String(body.port || resolved.port || "9007").trim();
  const company = String(body.company || resolved.company || "").trim();

  if (!host) {
    return apiError(
      "Set TALLY_HOST (cloud server hostname or IP). On TS Plus server use 127.0.0.1 for local test.",
      400
    );
  }

  const result = await testTallyGateway(host, port, company);
  return apiSuccess(result);
}
