import {
  apiError,
  apiSuccess,
  authorize,
  getServerSupabase,
} from "@/lib/rbac/api-auth";
import { fetchTodayFollowups } from "@/lib/followups/fetch";
import { getAdminClient } from "@/lib/supabase/admin";

async function getFollowupsSupabase() {
  return getAdminClient() ?? (await getServerSupabase());
}

export async function GET() {
  const auth = await authorize("followups", "read");
  if ("error" in auth) return auth.error;

  try {
    const supabase = await getFollowupsSupabase();
    const result = await fetchTodayFollowups(supabase);
    return apiSuccess(result);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to load followups", 500);
  }
}
