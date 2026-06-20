import type { FbosRole, PermissionResource } from "@/lib/rbac/permissions";
import { hasPermission } from "@/lib/rbac/permissions";

const ROUTE_RESOURCE: Record<string, PermissionResource> = {
  "/sales-workbench": "leads",
  "/sales": "leads",
  "/operations": "jobs",
  "/finance": "clients",
  "/finance-dashboard": "clients",
  "/observations": "dashboard",
  "/errors": "dashboard",
  "/compliance": "jobs",
  "/execution-board": "dashboard",
  "/chat-center": "dashboard",
  "/knowledge-hub": "sops",
  "/ai": "dashboard",
  "/data": "dashboard",
  "/integrations": "integrations",
  "/fbos-settings": "dashboard",
  "/admin": "profiles",
  "/ceo-command-center": "dashboard",
};

export function canAccessRoute(role: FbosRole | undefined, href: string): boolean {
  if (!role) return false;
  if (href === "/" || href === "/login") return true;

  const resource = ROUTE_RESOURCE[href] || "dashboard";
  return hasPermission(role, resource, "read");
}
