import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

/** @deprecated Use lib/api/client.ts for data access. Auth-only client. */
export const supabase = createBrowserSupabaseClient();
