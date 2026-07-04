import { getAdminClient } from "@/lib/supabase/admin";
import {
  buildCanonicalFinanceSummary,
  buildTimeSeries,
  type CanonicalLineMetricRow,
  type CanonicalVoucherMetricRow,
} from "@/lib/tally/formulas/canonical-finance";
import { normalizeTallyReportKey, type TallyReportKey } from "@/lib/tally/canonical/tally-types";

export type TallyReportQuery = {
  from?: string | null;
  to?: string | null;
  report?: string | null;
  party?: string | null;
  ledger?: string | null;
  voucherType?: string | null;
  status?: string | null;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeDateRange(query: TallyReportQuery) {
  return {
    from: query.from || "2024-04-01",
    to: query.to || today(),
  };
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
  if (map[report]) return map[report] || null;
  return null;
}

export async function getCanonicalTallyReport(query: TallyReportQuery) {
  const supabase = getAdminClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const report = normalizeTallyReportKey(query.report);
  const { from, to } = normalizeDateRange(query);
  const typeFilter = query.voucherType || voucherTypeForReport(report);

  let db = supabase
    .from("tally_vouchers")
    .select("id, company, voucher_key, voucher_no, voucher_type, voucher_date, party_name, ledger_name, reference, narration, gst_no, amount, debit_total, credit_total, source_report, updated_at", { count: "exact" })
    .gte("voucher_date", from)
    .lte("voucher_date", to)
    .order("voucher_date", { ascending: false })
    .limit(1000);

  if (typeFilter) db = db.ilike("voucher_type", `%${typeFilter}%`);
  if (query.party) db = db.ilike("party_name", `%${query.party}%`);
  if (query.ledger) db = db.ilike("ledger_name", `%${query.ledger}%`);

  const { data, error, count } = await db;
  if (error) return { ok: false, error: error.message };

  const { data: lastRun } = await supabase
    .from("tally_sync_runs")
    .select("finished_at, status, parsed_counts, error_count")
    .order("started_at", { ascending: false })
    .limit(1);

  const { data: reportMeta } = await supabase
    .from("tally_reports")
    .select("missing_field_count, generated_at")
    .eq("report_type", report)
    .eq("from_date", from)
    .eq("to_date", to)
    .order("generated_at", { ascending: false })
    .limit(1);

  return {
    ok: true,
    source: "canonical_supabase",
    report,
    from,
    to,
    row_count: count || data?.length || 0,
    rows: data || [],
    generated_at: new Date().toISOString(),
    last_sync_at: lastRun?.[0]?.finished_at || null,
    sync_status: lastRun?.[0]?.status || "unknown",
    error_count: lastRun?.[0]?.error_count || 0,
    missing_field_count: reportMeta?.[0]?.missing_field_count || 0,
    canonical_report_generated_at: reportMeta?.[0]?.generated_at || null,
  };
}

export async function getCanonicalTallyMetrics(query: TallyReportQuery) {
  const supabase = getAdminClient();
  if (!supabase) return { ok: false, error: "Database not configured" };
  const { from, to } = normalizeDateRange(query);

  const { data, error } = await supabase
    .from("tally_vouchers")
    .select("id, voucher_type, amount, debit_total, credit_total, voucher_date, party_name, ledger_name")
    .gte("voucher_date", from)
    .lte("voucher_date", to)
    .limit(20000);

  if (error) return { ok: false, error: error.message };

  const { data: lines, error: linesError } = await supabase
    .from("tally_voucher_lines")
    .select("voucher_type, voucher_date, party_name, ledger_name, amount, debit, credit")
    .gte("voucher_date", from)
    .lte("voucher_date", to)
    .limit(40000);

  if (linesError) return { ok: false, error: linesError.message };

  const { data: persistedMetrics } = await supabase
    .from("tally_finance_metrics")
    .select("*")
    .gte("from_date", from)
    .lte("to_date", to)
    .order("generated_at", { ascending: false })
    .limit(1);

  return {
    ok: true,
    source: "canonical_supabase",
    from,
    to,
    generated_at: new Date().toISOString(),
    row_count: data?.length || 0,
    metrics: buildCanonicalFinanceSummary(
      ((data || []) as CanonicalVoucherMetricRow[]) || [],
      ((lines || []) as CanonicalLineMetricRow[]) || []
    ),
    persisted_metrics: persistedMetrics?.[0] || null,
    series: buildTimeSeries(((data || []) as CanonicalVoucherMetricRow[]) || []),
  };
}

export async function getCanonicalExpenses(query: TallyReportQuery) {
  const supabase = getAdminClient();
  if (!supabase) return { ok: false, error: "Database not configured" };
  const { from, to } = normalizeDateRange(query);

  let db = supabase
    .from("tally_expense_summary")
    .select("party_name, ledger_name, category, voucher_count, total_debit, total_credit, total_amount, month, generated_at")
    .gte("month", from)
    .lte("month", to)
    .order("total_amount", { ascending: false })
    .limit(500);

  if (query.party) db = db.ilike("party_name", `%${query.party}%`);
  if (query.ledger) db = db.ilike("ledger_name", `%${query.ledger}%`);

  const { data, error } = await db;
  if (error) return { ok: false, error: error.message };
  return { ok: true, source: "canonical_supabase", from, to, row_count: data?.length || 0, rows: data || [], generated_at: new Date().toISOString() };
}

export async function getCanonicalDiagnostics() {
  const supabase = getAdminClient();
  if (!supabase) return { ok: false, error: "Database not configured" };
  const { data, error } = await supabase
    .from("tally_ai_diagnostics")
    .select("id, severity, module, issue, evidence, suggestion, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { ok: false, error: error.message };
  return { ok: true, rows: data || [], row_count: data?.length || 0, generated_at: new Date().toISOString() };
}

export async function getCanonicalParties(query: TallyReportQuery) {
  const supabase = getAdminClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  let db = supabase
    .from("tally_parties")
    .select("company, party_name, party_type, ledger_name, gst_no, opening_balance, closing_balance, receivable_total, payable_total, updated_at")
    .order("party_name", { ascending: true })
    .limit(1000);

  if (query.party) db = db.ilike("party_name", `%${query.party}%`);
  if (query.ledger) db = db.ilike("ledger_name", `%${query.ledger}%`);

  const { data, error } = await db;
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    source: "canonical_supabase",
    row_count: data?.length || 0,
    rows: data || [],
    generated_at: new Date().toISOString(),
  };
}

export async function getCanonicalVouchers(query: TallyReportQuery) {
  const supabase = getAdminClient();
  if (!supabase) return { ok: false, error: "Database not configured" };
  const { from, to } = normalizeDateRange(query);
  const report = normalizeTallyReportKey(query.report);
  const typeFilter = query.voucherType || voucherTypeForReport(report);

  let db = supabase
    .from("tally_vouchers")
    .select("id, company, voucher_key, voucher_no, voucher_type, voucher_date, party_name, ledger_name, reference, narration, gst_no, amount, debit_total, credit_total, source_report, updated_at", { count: "exact" })
    .gte("voucher_date", from)
    .lte("voucher_date", to)
    .order("voucher_date", { ascending: false })
    .limit(500);

  if (typeFilter) db = db.ilike("voucher_type", `%${typeFilter}%`);
  if (query.party) db = db.ilike("party_name", `%${query.party}%`);
  if (query.ledger) db = db.ilike("ledger_name", `%${query.ledger}%`);

  const { data, error, count } = await db;
  if (error) return { ok: false, error: error.message };

  let lineDb = supabase
    .from("tally_voucher_lines")
    .select("id, voucher_id, voucher_no, voucher_type, voucher_date, ledger_name, party_name, line_type, amount, debit, credit, item_name, quantity, rate, gst_rate, tax_amount")
    .gte("voucher_date", from)
    .lte("voucher_date", to)
    .order("voucher_date", { ascending: false })
    .limit(2000);

  if (typeFilter) lineDb = lineDb.ilike("voucher_type", `%${typeFilter}%`);
  if (query.party) lineDb = lineDb.ilike("party_name", `%${query.party}%`);
  if (query.ledger) lineDb = lineDb.ilike("ledger_name", `%${query.ledger}%`);

  const { data: lineRows, error: lineError } = await lineDb;
  if (lineError) return { ok: false, error: lineError.message };

  return {
    ok: true,
    source: "canonical_supabase",
    report,
    from,
    to,
    row_count: count || data?.length || 0,
    rows: data || [],
    lines: lineRows || [],
    generated_at: new Date().toISOString(),
  };
}
