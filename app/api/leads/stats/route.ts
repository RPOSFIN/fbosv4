import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { fetchLeadStats } from "@/lib/leads/fetch";

export async function GET() {
  const auth = await authorize("leads", "read");
  if ("error" in auth) return auth.error;

  try {
    const stats = await fetchLeadStats();
    return apiSuccess(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load lead stats";
    return apiError(message, 500);
  }
}
