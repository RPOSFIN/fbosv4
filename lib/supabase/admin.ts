import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _adminClient: SupabaseClient | null = null

/**
 * Returns a Supabase admin client that bypasses RLS using the service role key.
 *
 * Returns `null` if SUPABASE_SERVICE_ROLE_KEY is not set rather than throwing,
 * so callers can degrade gracefully in environments where the key is absent.
 *
 * NEVER expose this client to the browser. Only use in Route Handlers,
 * Server Actions, or server-only utility modules.
 */
export function getAdminClient(): SupabaseClient | null {
  if (_adminClient) return _adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim()

  if (!url) {
    console.error('[supabase/admin] NEXT_PUBLIC_SUPABASE_URL is not set')
    return null
  }

  if (!serviceRoleKey) {
    console.error(
      '[supabase/admin] SUPABASE_SERVICE_ROLE_KEY is not set. ' +
        'Admin operations (profile lookups, RLS bypass) will be unavailable.'
    )
    return null
  }

  _adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return _adminClient
}

/**
 * Convenience: returns the admin client and throws if it is unavailable.
 * Use this in code paths where the service role key is truly required.
 */
export function requireAdminClient(): SupabaseClient {
  const client = getAdminClient()
  if (!client) {
    throw new Error(
      'Supabase admin client unavailable: SUPABASE_SERVICE_ROLE_KEY is not set'
    )
  }
  return client
}
