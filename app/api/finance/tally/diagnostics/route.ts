import { apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getCanonicalDiagnostics } from "@/lib/tally/canonical/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const result = await getCanonicalDiagnostics();
  return apiSuccess(result);
}
