"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { ROLE_LABELS, type FbosRole } from "@/lib/rbac/permissions";
import { useAuth } from "@/hooks/use-auth";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: FbosRole;
  is_active: boolean;
};

export default function AdminPage() {
  const { session } = useAuth();
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [error, setError] = useState("");

  const isAdmin =
    session?.profile.role === "super_admin" ||
    session?.profile.role === "admin";

  const loadUsers = useCallback(async () => {
    try {
      const data = await apiFetch<ProfileRow[]>("/api/admin/users");
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    }
  }, []);

  async function updateRole(userId: string, role: FbosRole) {
    await apiFetch("/api/admin/users", {
      method: "PATCH",
      body: JSON.stringify({ user_id: userId, role }),
    });
    await loadUsers();
  }

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;

    (async () => {
      try {
        const data = await apiFetch<ProfileRow[]>("/api/admin/users");
        if (active) setUsers(data);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load users");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-slate-400 mt-2">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">User & Role Management</h1>
      {error && <p className="text-red-400 mb-4">{error}</p>}

      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-2 text-left">Email</th>
            <th className="border p-2 text-left">Name</th>
            <th className="border p-2 text-left">Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="border p-2">{user.email}</td>
              <td className="border p-2">{user.full_name || "-"}</td>
              <td className="border p-2">
                <select
                  className="bg-slate-900 border p-1 rounded"
                  value={user.role}
                  onChange={(e) =>
                    updateRole(user.id, e.target.value as FbosRole)
                  }
                  disabled={
                    user.id === session?.profile.id &&
                    session?.profile.role !== "super_admin"
                  }
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
