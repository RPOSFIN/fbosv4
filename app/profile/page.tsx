"use client";

import { useAuth } from "@/hooks/use-auth";
import { ROLE_LABELS } from "@/lib/rbac/permissions";

export default function ProfilePage() {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="p-8">Loading profile...</div>;
  }

  if (!session) {
    return <div className="p-8">Not signed in.</div>;
  }

  const roleLabel =
    ROLE_LABELS[session.profile.role as keyof typeof ROLE_LABELS] ||
    session.profile.role;

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-3xl font-bold mb-6">User Profile</h1>
      <div className="border rounded-xl p-6 space-y-3">
        <div>
          <div className="text-xs text-slate-500">Email</div>
          <div>{session.profile.email}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Name</div>
          <div>{session.profile.full_name || "-"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Role</div>
          <div className="text-cyan-400">{roleLabel}</div>
        </div>
      </div>
    </div>
  );
}
