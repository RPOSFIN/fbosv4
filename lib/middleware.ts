import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAuthDisabled } from '@/lib/auth/disabled'

// Routes that must be reachable without a session.
const PUBLIC_PATHS = [
  '/login',
  '/unauthorized',
  // The entire /api/auth/** namespace handles its own auth – never intercept it.
  '/api/auth',
]

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
}

export async function middleware(request: NextRequest) {
  if (isAuthDisabled()) {
    return NextResponse.next({ request })
  }

  const { pathname } = request.nextUrl

  // Never block auth callback / session / logout routes.
  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request,
  })

  // Build a server client that can read AND refresh the session cookie.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write refreshed tokens into both the forwarded request and the response.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Always call getUser() (not getSession()) in middleware.
  // This validates the token server-side and triggers a refresh when the
  // access token is about to expire.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Unauthenticated user hitting a protected page → redirect to login.
  if (!user && !isPublic(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     *  - _next/static  (Next.js build artefacts)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - Any file with an extension (e.g. .svg, .png)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
