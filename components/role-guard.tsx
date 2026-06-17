"use client";

import { useAuth } from "@/hooks/use-auth";
import { hasPermission, type PermissionResource } from "@/lib/rbac/permissions";
import type { FbosRole } from "@/lib/rbac/permissions";

export default function RoleGuard({
  children,
  resource,
  action = "read",
}: {
  children: React.ReactNode;
  resource: PermissionResource;
  action?: "read" | "create" | "update" | "delete";
}) {
  const { session, loading } = useAuth();
  const role = session?.profile.role as FbosRole | undefined;

  if (loading) {
    return <div className="p-8">Checking permissions...</div>;
  }

  if (!role || !hasPermission(role, resource, action)) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold">Access Denied</h1>
        <p className="text-slate-400 mt-2">
          Your role does not allow this action.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
