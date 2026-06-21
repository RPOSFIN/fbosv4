import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { isAuthDisabled } from "@/lib/auth/disabled";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anon) {
    if (isAuthDisabled()) {
      return createBrowserClient("http://127.0.0.1:54321", "public-anon-key", {
        cookieOptions: getSupabaseCookieOptions(),
      });
    }
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createBrowserClient(url, anon, { cookieOptions: getSupabaseCookieOptions() });
}

/** @deprecated Use createSupabaseBrowserClient */
export const createBrowserSupabaseClient = createSupabaseBrowserClient;
