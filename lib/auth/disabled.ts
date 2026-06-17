/**
 * Auth bypass for local personal use. Checks both client-visible and server-only flags.
 */
export function isAuthDisabled(): boolean {
  if (
    process.env.NEXT_PUBLIC_AUTH_DISABLED === "true" ||
    process.env.FBOS_AUTH_DISABLED === "true"
  ) {
    return true;
  }
  // Fallback when .env.local wasn't loaded (dev server not restarted)
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  return false;
}

export const MOCK_USER_ID = "local-dev";

export const MOCK_USER = {
  id: MOCK_USER_ID,
  email: "dev@local",
  role: "super_admin" as const,
  name: "Local Dev",
};
