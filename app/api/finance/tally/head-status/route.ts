import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getTallyHeadStatus } from "@/lib/tally/canonical/head-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const rows = await getTallyHeadStatus();
  if (!rows) return apiError("Unable to load Tally head status", 500);
  return apiSuccess({ rows, generated_at: new Date().toISOString() });
}
