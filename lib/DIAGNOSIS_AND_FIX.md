# Auth 401 — Root Cause Analysis & Complete Fix

## The Bug Chain

```
Magic link click
     ↓
/api/auth/callback    ← BUG 1: browser client used, no Set-Cookie header emitted
     ↓                         Session token lost immediately
     ↓ (redirects to /dashboard)
middleware            ← BUG 3: matcher covers /api/auth/**, intercepts callback
     ↓                         before token is exchanged, redirects to /login
/api/auth/session     ← BUG 2: calls getSession() which trusts client token;
     ↓                         also constructs client without reading request cookies
lib/rbac/api-auth.ts  ← BUG 4: calls adminClient unconditionally; if
                                SUPABASE_SERVICE_ROLE_KEY missing → throws → 401
```

---

## Bug 1 — app/api/auth/callback/route.ts

Root cause: The callback route used createBrowserClient (or createRouteHandlerClient from
the old @supabase/auth-helpers-nextjs) instead of createServerClient from @supabase/ssr.
The browser client does not write Set-Cookie response headers — it stores tokens in memory
only. exchangeCodeForSession() succeeds internally but the session cookie is never sent to
the browser.

Fix: Use createServerClient with cookie handlers that write into NextResponse.cookies.
The key is that setAll() must call response.cookies.set() — not just request.cookies.set().

---

## Bug 2 — app/api/auth/session/route.ts

Root cause 2a: Called supabase.auth.getSession() instead of supabase.auth.getUser().
Per Supabase docs: "getSession() reads the session from storage without verifying it with
the server — never use it for security decisions on the server." In @supabase/ssr the
correct server-side method is getUser() which validates the JWT on every call.

Root cause 2b: The Supabase client was constructed without reading the incoming request
cookies. This means the client had no token to validate.

Fix: Construct the client from the cookies() store; call getUser(); use admin client only
for the downstream profile/role lookup.

---

## Bug 3 — middleware.ts

Root cause: The middleware matcher pattern covers /api/auth/callback, /api/auth/session,
and /api/auth/logout. When the magic link redirects to /api/auth/callback, the middleware
runs first, sees no session (the token hasn't been exchanged yet), and redirects the user
to /login — invalidating the one-time magic link code.

Fix: Add /api/auth to the PUBLIC_PATHS list. The auth routes manage their own
authentication and must never be guarded by the session middleware check.

---

## Bug 4 — lib/supabase/admin.ts + lib/rbac/api-auth.ts

Root cause: admin.ts called createClient(url, serviceRoleKey!) at module load time.
If SUPABASE_SERVICE_ROLE_KEY is undefined, the ! cast silently passes undefined to
createClient, which creates a misconfigured client that throws on every DB call. Any
route handler that called withAuth() would then crash and return 401.

Fix:
- Make the admin client lazily initialised via getAdminClient().
- getAdminClient() returns null (not throws) when the key is absent.
- All callers check for null and degrade gracefully.
- Add SUPABASE_SERVICE_ROLE_KEY to your .env.local (see below).

---

## Environment Variables

Ensure your .env.local has all four keys:

  NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
  SUPABASE_SERVICE_ROLE_KEY=eyJ...   ← this was likely missing

The service role key is in your Supabase project → Settings → API → service_role.

---

## Files Changed

  app/api/auth/callback/route.ts   Use createServerClient + write cookies into NextResponse
  app/api/auth/session/route.ts    Use getUser() + cookie-aware server client
  app/api/auth/logout/route.ts     Use createServerClient with response cookie writer
  middleware.ts                    Exclude /api/auth/** from protection; use getUser()
  lib/supabase/admin.ts            Lazy getAdminClient() returning null when key absent
  lib/supabase/server.ts           Clean createSupabaseServerClient() using @supabase/ssr
  lib/supabase/browser.ts          Clean createSupabaseBrowserClient() using @supabase/ssr
  lib/rbac/api-auth.ts             Use getUser(), guard against missing admin client
  hooks/use-auth.tsx               Derive auth state from /api/auth/session (server-validated)

---

## Verification Steps

1. Add SUPABASE_SERVICE_ROLE_KEY to .env.local and restart the dev server.
2. Open /api/auth/session in a fresh browser tab — should return {"error":"Unauthorized"}.
3. Click a magic link. After redirect you should land on /dashboard with a valid session
   cookie (sb-*-auth-token visible in DevTools → Application → Cookies).
4. Refresh /api/auth/session — should now return {"user":{...,"role":"..."}} with HTTP 200.
