import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getFinanceMatrix } from "@/lib/services/finance-service";

export async function GET() {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  try {
    return apiSuccess(await getFinanceMatrix());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load finance matrix";
    return apiError(message, 500);
  }
}
