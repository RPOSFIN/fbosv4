import { NextResponse } from "next/server";
import { MOCK_AUTH_CONTEXT } from "@/lib/auth/config";
import { isAuthDisabled } from "@/lib/auth/disabled";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadUserProfile } from "@/lib/auth/profile";
import {
  hasPermission,
  type FbosRole,
  type PermissionAction,
  type PermissionResource,
} from "@/lib/rbac/permissions";

export type AuthContext = {
  userId: string;
  email: string;
  role: FbosRole;
  fullName: string | null;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  if (isAuthDisabled()) {
    return { ...MOCK_AUTH_CONTEXT };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const profile = await loadUserProfile(user.id, user.email);

  return {
    userId: user.id,
    email: profile.email || user.email || "",
    role: profile.role,
    fullName: profile.full_name,
  };
}

export async function authorize(
  resource: PermissionResource,
  action: PermissionAction
): Promise<{ ctx: AuthContext } | { error: NextResponse }> {
  if (isAuthDisabled()) {
    return { ctx: { ...MOCK_AUTH_CONTEXT } };
  }

  const ctx = await getAuthContext();
  if (!ctx) return { error: apiError("Unauthorized", 401) };
  if (!hasPermission(ctx.role, resource, action)) {
    return { error: apiError("Forbidden", 403) };
  }
  return { ctx };
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export async function getServerSupabase() {
  return createSupabaseServerClient();
}

export async function writeActivityLog(input: {
  entity_type: string;
  entity_id?: string;
  action: string;
  user_id: string;
  user_name?: string;
  notes?: string;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return;

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.from("activity_logs").insert([
      {
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        action: input.action,
        user_id: input.user_id,
        user_name: input.user_name,
        notes: input.notes,
      },
    ]);
  } catch {
    // Activity log is non-critical; do not fail the request
  }
}
