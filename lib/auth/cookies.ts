import type { NextRequest } from "next/server";

function isSupabaseAuthCookieName(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes("auth-token") ||
    lower.startsWith("sb-") ||
    lower.includes("supabase")
  );
}

/** True when Supabase auth cookies are present (session may still be validating). */
export function hasSupabaseAuthCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) =>
    isSupabaseAuthCookieName(cookie.name)
  );
}

/**
 * Client-side hint only (PKCE verifier, etc.). Session cookies are HttpOnly
 * and are NOT visible here — never use this to decide if the user is logged in.
 */
export function hasSupabaseAuthCookiesClient(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => {
    const name = part.trim().split("=")[0] ?? "";
    return isSupabaseAuthCookieName(name);
  });
}
