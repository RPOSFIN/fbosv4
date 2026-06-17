import type { FbosRole } from "@/lib/rbac/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: FbosRole;
};

/** Compatible with DBs that may not have is_active column yet. */
export async function loadUserProfile(
  userId: string,
  email: string | undefined
): Promise<ProfileRow> {
  const fallback: ProfileRow = {
    id: userId,
    email: email || "",
    full_name: email?.split("@")[0] || null,
    role: "viewer",
  };

  const admin = getAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        email: data.email || fallback.email,
        full_name: data.full_name,
        role: (data.role as FbosRole) || "viewer",
      };
    }
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (!error && data) {
    return {
      id: data.id,
      email: data.email || fallback.email,
      full_name: data.full_name,
      role: (data.role as FbosRole) || "viewer",
    };
  }

  return fallback;
}
