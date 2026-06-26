import { apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { readConfig, writeConfig } from "@/lib/engineering/ecp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Toggle the auto-promotion engine on/off. Manual fallback always remains available. */
export async function POST(request: Request) {
  const auth = await authorize("dashboard", "update");
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const autoPromote = Boolean(body?.autoPromote);
  writeConfig({ autoPromote });
  return apiSuccess(readConfig());
}
