import { apiError, authorize } from "@/lib/rbac/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await authorize("dashboard", "update");
  if ("error" in auth) return auth.error;

  return apiError(
    "Canonical Tally sync is disabled because it writes legacy non-v2 tables. Use the v2 sync pipeline before running owner finance refresh.",
    409
  );
}
