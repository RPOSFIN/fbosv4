import {
  getCanonicalTallyMetrics,
  getCanonicalTallyReport,
  getCanonicalVouchers,
  type TallyReportQuery,
} from "@/lib/tally/canonical/queries";
import { type CanonicalVoucherMetricRow } from "@/lib/tally/formulas/canonical-finance";

function isSalesQuery(query: TallyReportQuery): boolean {
  const report = (query.report || "").trim().toLowerCase().replace(/-/g, "_");
  const voucherType = (query.voucherType || "").toLowerCase();
  return report === "sales" || voucherType.includes("sales");
}

const PROFORMA_VARIANTS = [
  "PROFORMA",
  "PERFORMA",
  "PERFOMA",
  "PEFORMA",
  "PREFORMA",
  "PRFORMA",
  "PERFORFMA",
  "PERFOAMA",
  "PEROFMA",
  "PRO FORMA",
  "PER FORMA",
];

function amountOf(row: CanonicalVoucherMetricRow): number {
  const amount = Number(row.amount || 0);
  const debit = Number(row.debit_total || 0);
  const credit = Number(row.credit_total || 0);
  const value = Math.max(Math.abs(amount), Math.abs(debit), Math.abs(credit));
  return Number.isFinite(value) ? value : 0;
}

function rowText(row: CanonicalVoucherMetricRow): string {
  return [row.voucher_no, row.reference, row.narration, row.voucher_type]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
}

function isCommercialSalesRow(row: CanonicalVoucherMetricRow): boolean {
  const text = rowText(row);
  return (
    (row.voucher_type || "").toLowerCase().includes("sales") &&
    amountOf(row) >= 1 &&
    !PROFORMA_VARIANTS.some((token) => text.includes(token))
  );
}

function filterRows<T extends CanonicalVoucherMetricRow>(query: TallyReportQuery, rows: T[] | undefined): T[] {
  if (!isSalesQuery(query)) return rows || [];
  return (rows || []).filter((row) => isCommercialSalesRow(row));
}

export async function getCommercialTallyReport(query: TallyReportQuery) {
  const result = (await getCanonicalTallyReport(query)) as any;
  if (!result.ok || !isSalesQuery(query)) return result;
  const rawRows = (result.rows || []) as CanonicalVoucherMetricRow[];
  const rows = filterRows(query, rawRows);
  return {
    ...result,
    row_count: rows.length,
    raw_row_count: result.row_count,
    excluded_row_count: rawRows.length - rows.length,
    exclusion_rule: "Commercial Sales excludes proforma/performa typo variants and near-zero vouchers.",
    rows,
  };
}

export async function getCommercialTallyVouchers(query: TallyReportQuery) {
  const result = (await getCanonicalVouchers(query)) as any;
  if (!result.ok || !isSalesQuery(query)) return result;
  const rawRows = (result.rows || []) as CanonicalVoucherMetricRow[];
  const rows = filterRows(query, rawRows);
  const realKeys = new Set(rows.map((row) => row.id).filter(Boolean));
  return {
    ...result,
    row_count: rows.length,
    raw_row_count: result.row_count,
    excluded_row_count: rawRows.length - rows.length,
    exclusion_rule: "Commercial Sales excludes proforma/performa typo variants and near-zero vouchers.",
    rows,
    lines: (result.lines || []).filter((line: { voucher_id?: string }) => !line.voucher_id || realKeys.has(line.voucher_id)),
  };
}

export async function getCommercialTallyMetrics(query: TallyReportQuery) {
  const result = (await getCanonicalTallyMetrics(query)) as any;
  if (!result.ok) return result;
  return {
    ...result,
    sales_exclusion: {
      rule: "Commercial Sales excludes proforma/performa typo variants and near-zero vouchers.",
      formula_version: "tly04_v3_broad_proforma_filter",
    },
  };
}
