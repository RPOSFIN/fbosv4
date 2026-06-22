import type { FbosRole } from "@/lib/rbac/permissions";

export const MOCK_USER_ID = "fbos-demo-user";

export type MockUser = {
  id: string;
  email: string;
  name: string;
  role: FbosRole;
};

export const MOCK_USER: MockUser = {
  id: MOCK_USER_ID,
  email: "demo@fbos.local",
  name: "FBOS Demo",
  role: "super_admin",
};

export function isAuthDisabled() {
  return true;
}
