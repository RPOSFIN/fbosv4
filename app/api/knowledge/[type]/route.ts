import {
  apiError,
  apiSuccess,
  authorize,
} from "@/lib/rbac/api-auth";
import { getAdminClient } from "@/lib/supabase/admin";

const TABLE_MAP = {
  sops: "sops",
  checklists: "checklists",
  "route-maps": "route_maps",
  affirmations: "affirmations",
} as const;

type KnowledgeType = keyof typeof TABLE_MAP;

type Params = { params: Promise<{ type: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { type } = await params;
  const table = TABLE_MAP[type as KnowledgeType];
  if (!table) return apiError("Invalid knowledge type", 404);

  const resource =
    type === "route-maps"
      ? "route_maps"
      : (type as "sops" | "checklists" | "affirmations");

  const auth = await authorize(resource, "read");
  if ("error" in auth) return auth.error;

  const supabase = getAdminClient();
  if (!supabase) return apiSuccess([]);
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    const msg = error.message || "";
    if (
      error.code === "PGRST205" ||
      msg.includes("schema cache") ||
      msg.includes("does not exist")
    ) {
      return apiSuccess([]);
    }
    return apiError(error.message, 500);
  }
  return apiSuccess(data || []);
}

export async function POST(request: Request, { params }: Params) {
  const { type } = await params;
  const table = TABLE_MAP[type as KnowledgeType];
  if (!table) return apiError("Invalid knowledge type", 404);

  const resource =
    type === "route-maps"
      ? "route_maps"
      : (type as "sops" | "checklists" | "affirmations");

  const auth = await authorize(resource, "create");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const body = await request.json();
  const supabase = getAdminClient();
  if (!supabase) return apiError("Database not configured", 503);

  const { data, error } = await supabase
    .from(table)
    .insert([{ ...body, created_by: ctx.userId, updated_by: ctx.userId }])
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiSuccess(data, 201);
}

export async function PATCH(request: Request, { params }: Params) {
  const { type } = await params;
  const table = TABLE_MAP[type as KnowledgeType];
  if (!table) return apiError("Invalid knowledge type", 404);

  const resource =
    type === "route-maps"
      ? "route_maps"
      : (type as "sops" | "checklists" | "affirmations");

  const auth = await authorize(resource, "update");
  if ("error" in auth) return auth.error;

  const { ctx } = auth;
  const body = await request.json();
  const id = body.id as string | undefined;
  if (!id) return apiError("id is required", 400);

  const supabase = getAdminClient();
  if (!supabase) return apiError("Database not configured", 503);
  const updates = { ...body };
  delete updates.id;
  const { data, error } = await supabase
    .from(table)
    .update({ ...updates, updated_by: ctx.userId })
    .eq("id", id)
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiSuccess(data);
}
