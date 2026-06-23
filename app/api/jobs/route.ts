import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getJobs } from "@/lib/services/operations-service";

export async function GET(request: Request) {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || "100")));
  const status = url.searchParams.get("status")?.trim() || "";

  try {
    const result = await getJobs({ limit, status });
    return apiSuccess(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load jobs";
    return apiError(message, 500);
  }
}
