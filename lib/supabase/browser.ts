import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: getSupabaseCookieOptions() }
  );
}

/** @deprecated Use createSupabaseBrowserClient */
export const createBrowserSupabaseClient = createSupabaseBrowserClient;
