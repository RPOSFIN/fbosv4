export const MOCK_USER_ID = "fbos-demo-user";

export const MOCK_USER = {
  id: MOCK_USER_ID,
  email: "demo@fbos.local",
  name: "FBOS Demo",
  role: "super_admin" as const,
};

export function isAuthDisabled() {
  return true;
}
