import {
  getCanonicalTallyMetrics,
  getCanonicalTallyReport,
  getCanonicalVouchers,
  type TallyReportQuery,
} from "@/lib/tally/canonical/queries";
import { isRealSalesVoucher, type CanonicalVoucherMetricRow } from "@/lib/tally/formulas/canonical-finance";

function isSalesQuery(query: TallyReportQuery): boolean {
  const report = (query.report || "").trim().toLowerCase().replace(/-/g, "_");
  const voucherType = (query.voucherType || "").toLowerCase();
  return report === "sales" || voucherType.includes("sales");
}

function filterRows<T extends CanonicalVoucherMetricRow>(query: TallyReportQuery, rows: T[] | undefined): T[] {
  if (!isSalesQuery(query)) return rows || [];
  return (rows || []).filter((row) => isRealSalesVoucher(row));
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
    exclusion_rule: "Commercial Sales excludes proforma and zero-value proforma vouchers.",
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
    exclusion_rule: "Commercial Sales excludes proforma and zero-value proforma vouchers.",
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
      rule: "Commercial Sales excludes proforma and zero-value proforma vouchers.",
      formula_version: "tly04_v2_excludes_proforma_sales",
    },
  };
}
