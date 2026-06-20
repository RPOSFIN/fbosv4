import { apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getMaskedIntegrationConfig } from "@/lib/integrations/mask-config";

export async function GET() {
  const auth = await authorize("integrations", "read");
  if ("error" in auth) return auth.error;

  return apiSuccess(getMaskedIntegrationConfig());
}

export async function POST() {
  const auth = await authorize("integrations", "update");
  if ("error" in auth) return auth.error;

  return apiSuccess({
    message: "Integration config is managed via .env.local",
    config: getMaskedIntegrationConfig(),
  });
}
