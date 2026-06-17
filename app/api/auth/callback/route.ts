import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import {
  AUTH_NEXT_COOKIE,
  readNextFromCookie,
  safeNextPath,
} from "@/lib/auth/next-path";
import {
  copyCookies,
  createSupabaseRouteHandlerClient,
} from "@/lib/supabase/server";

function loginRedirect(origin: string, message: string) {
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(message)}`
  );
}

function redirectWithCookies(
  origin: string,
  next: string,
  cookieCarrier: NextResponse
) {
  const redirectResponse = NextResponse.redirect(`${origin}${next}`);
  copyCookies(cookieCarrier, redirectResponse);
  redirectResponse.cookies.set(AUTH_NEXT_COOKIE, "", { maxAge: 0, path: "/" });
  return redirectResponse;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const oauthError =
    searchParams.get("error_description") || searchParams.get("error");
  if (oauthError && !searchParams.get("code") && !searchParams.get("token_hash")) {
    return loginRedirect(origin, oauthError);
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const nextFromCookie = readNextFromCookie(
    request.cookies.get(AUTH_NEXT_COOKIE)?.value
  );
  const next = safeNextPath(searchParams.get("next") || nextFromCookie);

  const cookieCarrier = NextResponse.next({ request });
  const supabase = createSupabaseRouteHandlerClient(request, cookieCarrier);

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession:", error.message);
      return loginRedirect(
        origin,
        error.message.includes("PKCE") || error.message.includes("code verifier")
          ? "Magic link expired or opened in different browser. Request NEW link in SAME browser tab."
          : error.message
      );
    }
    if (data.user) await ensureUserProfile(data.user);
    return redirectWithCookies(origin, next, cookieCarrier);
  }

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (error) {
      console.error("[auth/callback] verifyOtp:", error.message);
      return loginRedirect(origin, error.message);
    }
    if (data.user) await ensureUserProfile(data.user);
    return redirectWithCookies(origin, next, cookieCarrier);
  }

  return loginRedirect(
    origin,
    "Invalid or expired login link. Please request a new magic link."
  );
}
