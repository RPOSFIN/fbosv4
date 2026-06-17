/** Cookie settings for localhost HTTP — Secure=true breaks auth on http://localhost */
export function getSupabaseCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: isProd,
  };
}
