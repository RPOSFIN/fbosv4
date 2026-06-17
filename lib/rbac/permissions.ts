export const FBOS_ROLES = [
  "super_admin",
  "admin",
  "sales",
  "call_coach",
  "operations",
  "accounts",
  "viewer",
] as const;

export type FbosRole = (typeof FBOS_ROLES)[number];

export type PermissionAction = "read" | "create" | "update" | "delete";

export type PermissionResource =
  | "dashboard"
  | "leads"
  | "followups"
  | "quotations"
  | "clients"
  | "jobs"
  | "call_coach_notes"
  | "sops"
  | "checklists"
  | "route_maps"
  | "affirmations"
  | "activity_logs"
  | "audit_logs"
  | "profiles"
  | "imports"
  | "integrations";

const ADMIN_ROLES: FbosRole[] = ["super_admin", "admin"];
const READ_ALL: FbosRole[] = [
  "super_admin",
  "admin",
  "sales",
  "call_coach",
  "operations",
  "accounts",
  "viewer",
];

const SALES_WRITE: FbosRole[] = ["super_admin", "admin", "sales"];
const CALL_COACH_WRITE: FbosRole[] = [
  "super_admin",
  "admin",
  "sales",
  "call_coach",
];
const OPS_WRITE: FbosRole[] = ["super_admin", "admin", "operations"];
const ACCOUNTS_WRITE: FbosRole[] = ["super_admin", "admin", "accounts"];
const KNOWLEDGE_WRITE: FbosRole[] = ["super_admin", "admin"];

const MATRIX: Record<
  PermissionResource,
  Record<PermissionAction, FbosRole[]>
> = {
  dashboard: {
    read: READ_ALL,
    create: ADMIN_ROLES,
    update: ADMIN_ROLES,
    delete: ADMIN_ROLES,
  },
  leads: {
    read: READ_ALL,
    create: SALES_WRITE,
    update: SALES_WRITE,
    delete: [...SALES_WRITE],
  },
  followups: {
    read: READ_ALL,
    create: CALL_COACH_WRITE,
    update: CALL_COACH_WRITE,
    delete: ADMIN_ROLES,
  },
  quotations: {
    read: READ_ALL,
    create: SALES_WRITE,
    update: SALES_WRITE,
    delete: ADMIN_ROLES,
  },
  clients: {
    read: READ_ALL,
    create: [...SALES_WRITE, ...ACCOUNTS_WRITE],
    update: [...SALES_WRITE, ...ACCOUNTS_WRITE],
    delete: ADMIN_ROLES,
  },
  jobs: {
    read: READ_ALL,
    create: OPS_WRITE,
    update: OPS_WRITE,
    delete: ADMIN_ROLES,
  },
  call_coach_notes: {
    read: READ_ALL,
    create: CALL_COACH_WRITE,
    update: CALL_COACH_WRITE,
    delete: ADMIN_ROLES,
  },
  sops: {
    read: READ_ALL,
    create: KNOWLEDGE_WRITE,
    update: KNOWLEDGE_WRITE,
    delete: KNOWLEDGE_WRITE,
  },
  checklists: {
    read: READ_ALL,
    create: KNOWLEDGE_WRITE,
    update: KNOWLEDGE_WRITE,
    delete: KNOWLEDGE_WRITE,
  },
  route_maps: {
    read: READ_ALL,
    create: KNOWLEDGE_WRITE,
    update: KNOWLEDGE_WRITE,
    delete: KNOWLEDGE_WRITE,
  },
  affirmations: {
    read: READ_ALL,
    create: KNOWLEDGE_WRITE,
    update: KNOWLEDGE_WRITE,
    delete: KNOWLEDGE_WRITE,
  },
  activity_logs: {
    read: [...ADMIN_ROLES, "sales", "operations", "accounts"],
    create: READ_ALL.filter((r) => r !== "viewer"),
    update: ADMIN_ROLES,
    delete: ["super_admin"],
  },
  audit_logs: {
    read: ADMIN_ROLES,
    create: ADMIN_ROLES,
    update: [],
    delete: ["super_admin"],
  },
  profiles: {
    read: READ_ALL,
    create: ["super_admin"],
    update: ADMIN_ROLES,
    delete: ["super_admin"],
  },
  imports: {
    read: SALES_WRITE,
    create: SALES_WRITE,
    update: SALES_WRITE,
    delete: ADMIN_ROLES,
  },
  integrations: {
    read: ADMIN_ROLES,
    create: ADMIN_ROLES,
    update: ADMIN_ROLES,
    delete: ["super_admin"],
  },
};

export function hasPermission(
  role: FbosRole,
  resource: PermissionResource,
  action: PermissionAction
): boolean {
  return MATRIX[resource][action].includes(role);
}

export function isAdminRole(role: FbosRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export const ROLE_LABELS: Record<FbosRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  sales: "Sales",
  call_coach: "Call Coach",
  operations: "Operations",
  accounts: "Accounts",
  viewer: "Viewer",
};
