import { apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getEngineeringInfo } from "@/lib/engineering/ecp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  return apiSuccess(getEngineeringInfo());
}
