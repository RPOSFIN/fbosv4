import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import {
  addObservation,
  listObservations,
  listErrors,
  addError,
} from "@/lib/observations/store";

export async function GET(request: Request) {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const type = new URL(request.url).searchParams.get("type");
  if (type === "errors") return apiSuccess({ items: listErrors() });
  return apiSuccess({ items: listObservations() });
}

export async function POST(request: Request) {
  const auth = await authorize("dashboard", "create");
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const kind = String(body.kind || "observation");

  if (kind === "error") {
    const row = addError({
      module: String(body.module || "general"),
      message: String(body.message || body.text || "").trim(),
      depends_on: Array.isArray(body.depends_on) ? body.depends_on : [],
      severity: body.severity || "medium",
    });
    if (!row.message) return apiError("message required", 400);
    return apiSuccess(row, 201);
  }

  const row = addObservation({
    module: String(body.module || "general"),
    text: String(body.text || "").trim(),
    depends_on: Array.isArray(body.depends_on) ? body.depends_on : [],
  });
  if (!row.text) return apiError("text required", 400);
  return apiSuccess(row, 201);
}
