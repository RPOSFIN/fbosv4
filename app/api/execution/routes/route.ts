import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import {
  getRoute,
  listRoutes,
  updateRouteSlot,
  upsertRoute,
  type EmployeeRouteSlot,
} from "@/lib/execution/route-store";

export async function GET(request: Request) {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const employee = new URL(request.url).searchParams.get("employee")?.trim();
  if (employee) {
    const route = getRoute(employee);
    return apiSuccess(route || { employee, slots: [], updated_at: null });
  }
  return apiSuccess({ routes: listRoutes() });
}

export async function POST(request: Request) {
  const auth = await authorize("dashboard", "update");
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const employee = String(body.employee || "").trim();
  const slots = body.slots as EmployeeRouteSlot[] | undefined;
  if (!employee || !Array.isArray(slots)) {
    return apiError("employee and slots[] required", 400);
  }

  const route = upsertRoute(employee, slots);
  return apiSuccess(route, 201);
}

export async function PATCH(request: Request) {
  const auth = await authorize("dashboard", "update");
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const employee = String(body.employee || "").trim();
  const index = Number(body.index);
  const time = body.time as string | undefined;
  const task = body.task as string | undefined;
  if (!employee || Number.isNaN(index)) {
    return apiError("employee and index required", 400);
  }

  const route = updateRouteSlot(employee, index, {
    ...(time !== undefined ? { time } : {}),
    ...(task !== undefined ? { task } : {}),
  });
  if (!route) return apiError("Route slot not found", 404);
  return apiSuccess(route);
}
