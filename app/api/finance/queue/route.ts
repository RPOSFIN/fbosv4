import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const supabase = getAdminClient();
  if (!supabase) {
    return apiSuccess({ records: [], count: 0 });
  }
  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || "100")));
  const status = url.searchParams.get("status")?.trim() || "";
  const recordType = url.searchParams.get("record_type")?.trim() || "";

  let query = supabase
    .from("finance_import_queue")
    .select(
      "id, company, record_type, description, amount, voucher_date, voucher_no, voucher_type, ledger_name, party_name, debit, credit, reference, narration, gst_no, status, source, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);
  if (recordType) query = query.ilike("record_type", recordType);

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 500);

  return apiSuccess({ records: data || [], count: count ?? data?.length ?? 0 });
}
