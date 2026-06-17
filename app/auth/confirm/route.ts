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

/** Server-side token_hash handler (custom Supabase email template). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const nextFromCookie = readNextFromCookie(
    request.cookies.get(AUTH_NEXT_COOKIE)?.value
  );
  const next = safeNextPath(searchParams.get("next") || nextFromCookie);

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Invalid login link")}`
    );
  }

  const cookieCarrier = NextResponse.next({ request });
  const supabase = createSupabaseRouteHandlerClient(request, cookieCarrier);

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as EmailOtpType,
  });

  if (error) {
    console.error("[auth/confirm] verifyOtp:", error.message);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  if (data.user) await ensureUserProfile(data.user);

  const redirectResponse = NextResponse.redirect(`${origin}${next}`);
  copyCookies(cookieCarrier, redirectResponse);
  redirectResponse.cookies.set(AUTH_NEXT_COOKIE, "", { maxAge: 0, path: "/" });
  return redirectResponse;
}
