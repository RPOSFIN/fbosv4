'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { MOCK_USER } from '@/lib/auth/disabled'
import { isAuthDisabled } from '@/lib/auth/disabled'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

interface AuthUser {
  id: string
  email: string | undefined
  role: string | null
  profile: {
    full_name: string | null
    avatar_url: string | null
  } | null
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  error: null,
})

export function useAuth() {
  return useContext(AuthContext)
}

/**
 * Fetches the enriched session (user + role + profile) from the server-side
 * /api/auth/session endpoint. This is the single source of truth for auth state
 * in Client Components because:
 *
 * 1. It calls getUser() server-side (validates the JWT with Supabase Auth).
 * 2. It returns the role from the profiles table (requires service role key).
 * 3. Browser-side getSession() cannot be trusted for security decisions.
 */
async function fetchSession(): Promise<AuthUser | null> {
  const res = await fetch('/api/auth/session', { credentials: 'include' })
  if (!res.ok) return null
  const data = await res.json()
  return data.user ?? null
}

const MOCK_AUTH_USER: AuthUser = {
  id: MOCK_USER.id,
  email: MOCK_USER.email,
  role: MOCK_USER.role,
  profile: { full_name: MOCK_USER.name, avatar_url: null },
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authOff = isAuthDisabled()
  const [state, setState] = useState<AuthState>({
    user: authOff ? MOCK_AUTH_USER : null,
    loading: !authOff,
    error: null,
  })

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const user = await fetchSession()
      setState({ user, loading: false, error: null })
    } catch (err) {
      setState({ user: null, loading: false, error: String(err) })
    }
  }, [])

  useEffect(() => {
    if (isAuthDisabled()) {
      setState({ user: MOCK_AUTH_USER, loading: false, error: null })
      return
    }

    refresh()

    // Listen for Supabase auth state changes (sign-in, sign-out, token refresh)
    // and re-fetch the server session to keep the client state in sync.
    const supabase = createSupabaseBrowserClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        refresh()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [refresh])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
