import { NextRequest } from "next/server";
import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import {
  addError,
  addObservation,
  listErrors,
  listObservations,
} from "@/lib/observations/store";

export async function GET(request: NextRequest) {
  const auth = await authorize("jobs", "read");
  if ("error" in auth) return auth.error;

  const type = request.nextUrl.searchParams.get("type");
  if (type === "errors") {
    return apiSuccess({ items: listErrors() });
  }

  return apiSuccess({ items: listObservations() });
}

export async function POST(request: NextRequest) {
  const auth = await authorize("jobs", "create");
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));

  if (body.kind === "error") {
    const message = String(body.message || "").trim();
    if (!message) return apiError("message required", 400);

    const row = addError({
      module: String(body.module || "compliance"),
      message,
      depends_on: Array.isArray(body.depends_on) ? body.depends_on : [],
      severity:
        body.severity === "low" || body.severity === "medium" || body.severity === "high"
          ? body.severity
          : "medium",
    });

    return apiSuccess({ item: row }, 201);
  }

  const text = String(body.text || "").trim();
  if (!text) return apiError("text required", 400);

  const row = addObservation({
    module: String(body.module || "compliance"),
    text,
    depends_on: Array.isArray(body.depends_on) ? body.depends_on : [],
  });

  return apiSuccess({ item: row }, 201);
}
