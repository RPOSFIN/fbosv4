import { getAdminClient } from "@/lib/supabase/admin";
import { buildDerivedBalanceSheet } from "@/lib/tally/canonical/balance-sheet";

export type TallyHeadStatus = {
  key: string;
  label: string;
  status: "synced" | "derived" | "unavailable";
  row_count: number;
  source: string;
  note: string;
};

const HEADS: Array<{ key: string; label: string }> = [
  { key: "bank_cash", label: "Bank / Cash" },
  { key: "profit_loss", label: "Profit & Loss" },
  { key: "balance_sheet", label: "Balance Sheet" },
  { key: "receivables", label: "Receivables" },
  { key: "payables", label: "Payables" },
  { key: "ledger", label: "Ledger DR/CR" },
];

export async function getTallyHeadStatus(): Promise<TallyHeadStatus[]> {
  const supabase = getAdminClient();
  if (!supabase) return HEADS.map((h) => ({ ...h, status: "unavailable", row_count: 0, source: "none", note: "Database not configured" }));

  const { data: reports } = await supabase
    .from("tally_reports")
    .select("report_type, row_count, missing_field_count, generated_at")
    .in("report_type", HEADS.map((h) => h.key));

  const { count: ledgerCount } = await supabase
    .from("tally_ledgers")
    .select("id", { count: "exact", head: true });
  const { count: partyCount } = await supabase
    .from("tally_parties")
    .select("id", { count: "exact", head: true });
  const { count: bankLineCount } = await supabase
    .from("tally_voucher_lines")
    .select("id", { count: "exact", head: true })
    .or("ledger_name.ilike.%bank%,ledger_name.ilike.%cash%,ledger_name.ilike.%hdfc%,ledger_name.ilike.%icici%,ledger_name.ilike.%axis%,ledger_name.ilike.%sbi%,ledger_name.ilike.%kotak%");

  const balanceSheet = await buildDerivedBalanceSheet();

  return HEADS.map((head) => {
    const report = reports?.find((r) => r.report_type === head.key);
    if (report && Number(report.row_count || 0) > 0) {
      return { ...head, status: "synced", row_count: Number(report.row_count || 0), source: "tally_reports", note: "Structured Tally report parsed" };
    }
    if (head.key === "ledger" && (ledgerCount || 0) > 0) {
      return { ...head, status: "synced", row_count: ledgerCount || 0, source: "tally_ledgers", note: "Ledger masters with DR/CR balances are available" };
    }
    if (head.key === "balance_sheet" && balanceSheet.status === "derived" && balanceSheet.row_count > 0) {
      return { ...head, status: "derived", row_count: balanceSheet.row_count, source: "tally_ledgers", note: "Derived from synced ledger groups; structured Tally Balance Sheet report parser is still pending" };
    }
    if ((head.key === "receivables" || head.key === "payables") && (partyCount || 0) > 0) {
      return { ...head, status: "derived", row_count: partyCount || 0, source: "tally_parties", note: "Derived from party/ledger balances until outstanding report parses" };
    }
    if (head.key === "bank_cash" && (bankLineCount || 0) > 0) {
      return { ...head, status: "derived", row_count: bankLineCount || 0, source: "tally_voucher_lines", note: "Derived from bank/cash ledger lines until bank book report parses" };
    }
    if (head.key === "profit_loss") {
      return { ...head, status: "derived", row_count: 0, source: "canonical_formula", note: "Derived from sales/purchase/payment data until P&L report parses" };
    }
    return { ...head, status: "unavailable", row_count: Number(report?.row_count || 0), source: "tally_reports", note: "Tally report returned no structured rows; parser/report builder needs TLY-05 work" };
  });
}
