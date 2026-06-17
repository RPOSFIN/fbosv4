import { getAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

/** Create profiles row after first login if trigger did not run. */
export async function ensureUserProfile(user: User) {
  const admin = getAdminClient();
  if (!admin) return;

  const email = user.email || "";
  const { error } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email,
      full_name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        email.split("@")[0] ||
        "User",
      role: "viewer",
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    // Retry without is_active if column missing
    if (error.message.includes("is_active")) {
      await admin.from("profiles").upsert(
        {
          id: user.id,
          email,
          full_name: email.split("@")[0] || "User",
          role: "viewer",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } else {
      console.warn("[ensureUserProfile]", error.message);
    }
  }
}
