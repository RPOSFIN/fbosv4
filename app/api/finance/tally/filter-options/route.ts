import { apiError, apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { normalizeTallyReportKey, type TallyReportKey } from "@/lib/tally/canonical/tally-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function voucherTypeForReport(report: TallyReportKey): string | null {
  const map: Partial<Record<TallyReportKey, string>> = {
    sales: "Sales",
    purchase: "Purchase",
    receipt: "Receipt",
    payment: "Payment",
    journal: "Journal",
    contra: "Contra",
    debit_note: "Debit Note",
    credit_note: "Credit Note",
  };
  return map[report] || null;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => (value || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

async function ledgerBalances(supabase: ReturnType<typeof getAdminClient>, ledgers: string[]) {
  if (!supabase || ledgers.length === 0) return {};
  const { data } = await supabase
    .from("tally_ledgers_v2")
    .select("ledger_name, closing_balance, opening_balance, parent_group, primary_group")
    .in("ledger_name", ledgers)
    .limit(5000);

  return Object.fromEntries((data || []).map((row) => [row.ledger_name, {
    closing_balance: Number(row.closing_balance || 0),
    opening_balance: Number(row.opening_balance || 0),
    parent_group: row.parent_group || null,
    primary_group: row.primary_group || null,
  }]));
}

export async function GET(request: Request) {
  const auth = await authorize("dashboard", "read");
  if ("error" in auth) return auth.error;

  const supabase = getAdminClient();
  if (!supabase) return apiError("Database not configured", 503);

  const url = new URL(request.url);
  const from = url.searchParams.get("from") || "2024-04-01";
  const to = url.searchParams.get("to") || today();
  const report = normalizeTallyReportKey(url.searchParams.get("report"));
  const voucherType = url.searchParams.get("voucherType") || "";
  const typeFilter = voucherType || voucherTypeForReport(report);

  if (report === "expenses") {
    const { data, error } = await supabase
      .from("expense_heads_v2")
      .select("party_name, ledger_name")
      .gte("month", from)
      .lte("month", to)
      .limit(5000);

    if (error) return apiError(error.message, 500);
    const ledgerOptions = uniqueStrings((data || []).map((row) => row.ledger_name));

    return apiSuccess({
      source: "expense_heads_v2",
      report,
      from,
      to,
      party_options: uniqueStrings((data || []).map((row) => row.party_name)),
      ledger_options: ledgerOptions,
      ledger_balances: await ledgerBalances(supabase, ledgerOptions),
    });
  }

  if (report === "party_summary" || report === "party_withdrawal") {
    const { data, error } = await supabase
      .from("tally_parties_v2")
      .select("party_name, ledger_name")
      .order("party_name", { ascending: true })
      .limit(5000);

    if (error) return apiError(error.message, 500);
    const ledgerOptions = uniqueStrings((data || []).map((row) => row.ledger_name));

    return apiSuccess({
      source: "tally_parties_v2",
      report,
      from,
      to,
      party_options: uniqueStrings((data || []).map((row) => row.party_name)),
      ledger_options: ledgerOptions,
      ledger_balances: await ledgerBalances(supabase, ledgerOptions),
    });
  }

  let db = supabase
    .from("tally_vouchers_v2")
    .select("party_name, party_ledger_name")
    .gte("voucher_date", from)
    .lte("voucher_date", to)
    .order("party_name", { ascending: true })
    .limit(5000);

  if (typeFilter) db = db.ilike("voucher_type", `%${typeFilter}%`);

  const { data, error } = await db;
  if (error) return apiError(error.message, 500);
  const ledgerOptions = uniqueStrings((data || []).map((row) => row.party_ledger_name));

  return apiSuccess({
    source: "tally_vouchers_v2",
    report,
    from,
    to,
    voucher_type: typeFilter || "",
    party_options: uniqueStrings((data || []).map((row) => row.party_name)),
    ledger_options: ledgerOptions,
    ledger_balances: await ledgerBalances(supabase, ledgerOptions),
  });
}
