import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import {
  assignOrderVendor,
  listOrderVendors,
  validateVendorPlacement,
} from "@/lib/operations/vendor-rules";

export async function GET() {
  const auth = await authorize("jobs", "read");
  if ("error" in auth) return auth.error;
  return apiSuccess({ orders: listOrderVendors() });
}

export async function POST(request: Request) {
  const auth = await authorize("jobs", "create");
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "validate");

  if (action === "assign") {
    const orderId = String(body.orderId || "").trim();
    const vendor = String(body.vendor || "").trim();
    if (!orderId || !vendor) return apiError("orderId and vendor required", 400);
    assignOrderVendor(orderId, vendor);
    return apiSuccess({ ok: true, orderId, vendor });
  }

  const orderId = String(body.orderId || "").trim();
  const vendor = String(body.vendor || "").trim();
  if (!orderId || !vendor) return apiError("orderId and vendor required", 400);

  const result = validateVendorPlacement(orderId, vendor);
  if (!result.allowed) return apiSuccess(result, 422);
  return apiSuccess(result);
}
