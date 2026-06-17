import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json.error || `Request failed (${res.status})`);
  }

  return json.data as T;
}

export async function signOut() {
  const supabase = createSupabaseBrowserClient();
  await supabase.auth.signOut();
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export type SessionProfile = {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
};

export type SessionResponse = {
  user: { id: string; email: string };
  profile: SessionProfile;
};

export async function fetchSession(): Promise<SessionResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch("/api/auth/session", {
      credentials: "include",
      signal: controller.signal,
    });

    if (res.status === 401) return null;

    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}