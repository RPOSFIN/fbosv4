import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { createCheckpoint } from "@/lib/engineering/ecp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Create one Engineering Checkpoint (LOCAL ONLY).
 * Writes /ecp/ECP-NNNN.json and refreshes PROJECT_STATUS + HANDOFF markers.
 * Performs NO git push/merge/tag and never updates 3R.
 */
export async function POST() {
  const auth = await authorize("dashboard", "create");
  if ("error" in auth) return auth.error;

  try {
    const ecp = createCheckpoint();
    return apiSuccess({ ok: true, ecp, message: "Checkpoint Created Successfully" }, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to create checkpoint", 500);
  }
}
