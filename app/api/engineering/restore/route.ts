import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { restore } from "@/lib/engineering/promotion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Manual fallback: restore the latest 3R or a specific ECP by creating a
 * non-destructive recovery branch at the target commit (working tree untouched).
 * Body: { target: "latest-3r" | "ECP-0001" }
 */
export async function POST(request: Request) {
  const auth = await authorize("dashboard", "update");
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const target = String(body?.target || "latest-3r");
    const result = restore(target);
    if (!result.ok) return apiError(result.message, 404);
    return apiSuccess(result);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Restore failed", 500);
  }
}
