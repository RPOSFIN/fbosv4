export const AUTH_NEXT_COOKIE = "fbos-auth-next";

export function safeNextPath(path?: string | null): string {
  if (!path) return "/";

  if (!path.startsWith("/")) {
    return "/";
  }

  if (path.startsWith("//")) {
    return "/";
  }

  return path;
}

export function readNextFromCookie(
  cookieValue?: string | null
): string {
  return safeNextPath(cookieValue);
}
