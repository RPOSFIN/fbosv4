import {
  apiError,
  apiSuccess,
  authorize,
} from "@/lib/rbac/api-auth";
import { getAdminClient } from "@/lib/supabase/admin";
import type { FbosRole } from "@/lib/rbac/permissions";

export async function GET() {
  const auth = await authorize("profiles", "read");
  if ("error" in auth) return auth.error;

  const admin = getAdminClient();
  if (!admin) return apiError("Admin client unavailable", 503);

  const { data, error } = await admin
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .order("email", { ascending: true });

  if (error) return apiError(error.message, 500);
  return apiSuccess(data || []);
}

export async function PATCH(request: Request) {
  const auth = await authorize("profiles", "update");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const body = await request.json();
  const userId = String(body.user_id || "").trim();
  const role = String(body.role || "").trim() as FbosRole;

  if (!userId || !role) {
    return apiError("user_id and role are required");
  }

  if (userId === ctx.userId && ctx.role !== "super_admin") {
    return apiError("Cannot change your own role", 403);
  }

  const admin = getAdminClient();
  if (!admin) return apiError("Admin client unavailable", 503);

  const { data, error } = await admin
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id, email, full_name, role, is_active")
    .single();

  if (error) return apiError(error.message, 500);
  return apiSuccess(data);
}
