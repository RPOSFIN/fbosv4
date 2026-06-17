import type { SessionResponse } from "@/lib/api/client";
import type { FbosRole } from "@/lib/rbac/permissions";
import { isAuthDisabled, MOCK_USER, MOCK_USER_ID } from "@/lib/auth/disabled";

export { isAuthDisabled, MOCK_USER, MOCK_USER_ID };

export const MOCK_DEV_ROLE: FbosRole = "super_admin";

export const MOCK_SESSION_RESPONSE: SessionResponse = {
  user: { id: MOCK_USER_ID, email: MOCK_USER.email },
  profile: {
    id: MOCK_USER_ID,
    email: MOCK_USER.email,
    role: MOCK_DEV_ROLE,
    full_name: MOCK_USER.name,
  },
};

export const MOCK_AUTH_CONTEXT = {
  userId: MOCK_USER_ID,
  email: MOCK_USER.email,
  role: MOCK_DEV_ROLE,
  fullName: MOCK_USER.name,
};
