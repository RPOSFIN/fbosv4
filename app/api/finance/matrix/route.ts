import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { buildFinanceMatrix, type FinanceRow } from "@/lib/finance/matrix";

export async function GET() {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const supabase = getAdminClient();
  if (!supabase) return apiError("Database not configured", 503);

  const { data, error } = await supabase
    .from("finance_import_queue")
    .select(
      "amount, record_type, party_name, voucher_date, voucher_no, description"
    )
    .limit(2000);

  if (error) return apiError(error.message, 500);

  return apiSuccess(buildFinanceMatrix((data as FinanceRow[]) || []));
}
