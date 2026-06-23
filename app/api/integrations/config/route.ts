import { authorize, apiError, apiSuccess } from "@/lib/rbac/api-auth";
import { getMaskedIntegrationConfig } from "@/lib/integrations/mask-config";
import { upsertEnvLocal } from "@/lib/integrations/tally-env";
import { testTallyGateway } from "@/lib/integrations/tally-gateway";

export async function GET() {
  const auth = await authorize("integrations", "read");
  if ("error" in auth) return auth.error;

  return apiSuccess(getMaskedIntegrationConfig());
}

export async function POST(request: Request) {
  const auth = await authorize("integrations", "update");
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "save");

  if (action === "test_tally") {
    const host = String(body.host || process.env.TALLY_HOST || "").trim();
    const port = String(body.port || process.env.TALLY_PORT || "9007").trim();
    const company = String(
      body.company || process.env.TALLY_COMPANY_NAME || ""
    ).trim();
    if (!host) return apiError("Tally host required", 400);
    const result = await testTallyGateway(host, port, company);
    return apiSuccess(result);
  }

  const vars: Record<string, string> = {};
  if (body.TALLY_HOST?.trim()) vars.TALLY_HOST = body.TALLY_HOST.trim();
  if (body.TALLY_PORT?.trim()) vars.TALLY_PORT = body.TALLY_PORT.trim();
  if (body.TALLY_COMPANY_NAME?.trim()) {
    vars.TALLY_COMPANY_NAME = body.TALLY_COMPANY_NAME.trim();
  }
  if (body.GOOGLE_WEBAPP_URL?.trim()) {
    vars.GOOGLE_WEBAPP_URL = body.GOOGLE_WEBAPP_URL.trim();
  }

  if (!Object.keys(vars).length) {
    return apiError("No config fields to save", 400);
  }

  upsertEnvLocal(vars);
  for (const [k, v] of Object.entries(vars)) {
    process.env[k] = v;
  }

  let testResult = null;
  if (vars.TALLY_HOST) {
    testResult = await testTallyGateway(
      vars.TALLY_HOST,
      vars.TALLY_PORT || "9007",
      vars.TALLY_COMPANY_NAME || process.env.TALLY_COMPANY_NAME
    );
  }

  return apiSuccess({
    saved: vars,
    config: getMaskedIntegrationConfig(),
    connectionTest: testResult,
  });
}
