import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { MOCK_SESSION_RESPONSE } from "@/lib/auth/config";
import { isAuthDisabled } from "@/lib/auth/disabled";
import { hasSupabaseAuthCookies } from "@/lib/auth/cookies";
import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import { loadUserProfile } from "@/lib/auth/profile";
import {
  copyCookies,
  createSupabaseRouteHandlerClient,
} from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  if (isAuthDisabled()) {
    return NextResponse.json({ data: MOCK_SESSION_RESPONSE });
  }

  if (!hasSupabaseAuthCookies(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieCarrier = NextResponse.next({ request });
  const routeClient = createSupabaseRouteHandlerClient(request, cookieCarrier);

  const {
    data: { user },
    error,
  } = await routeClient.auth.getUser();

  if (error || !user) {
    const jsonResponse = NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
    copyCookies(cookieCarrier, jsonResponse);
    return jsonResponse;
  }

  try {
    await ensureUserProfile(user);
  } catch (e) {
    console.warn("[auth/session] ensureUserProfile:", e);
  }

  const profile = await loadUserProfile(user.id, user.email);

  const jsonResponse = NextResponse.json({
    data: {
      user: { id: user.id, email: user.email },
      profile: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        full_name: profile.full_name,
      },
    },
  });

  copyCookies(cookieCarrier, jsonResponse);
  return jsonResponse;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = body.email as string | undefined;
  const password = body.password as string | undefined;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const cookieCarrier = NextResponse.next({ request });
  const supabase = createSupabaseRouteHandlerClient(request, cookieCarrier);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (data.user) {
    try {
      await ensureUserProfile(data.user);
    } catch (e) {
      console.warn("[auth/session] ensureUserProfile:", e);
    }
  }

  const jsonResponse = NextResponse.json({
    data: {
      user: { id: data.user.id, email: data.user.email },
      message: "Signed in successfully",
    },
  });

  copyCookies(cookieCarrier, jsonResponse);
  return jsonResponse;
}
