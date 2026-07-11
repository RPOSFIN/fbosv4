import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Server-side reads/writes: prefer service role, fall back to cookie SSR client. */
export async function getServerDataClient(): Promise<SupabaseClient | null> {
  const admin = getAdminClient();
  if (admin) return admin;

  try {
    return await createSupabaseServerClient();
  } catch {
    return null;
  }
}
