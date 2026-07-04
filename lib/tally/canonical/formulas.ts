export type TallyMetricRow = {
  voucher_type?: string | null;
  amount?: number | string | null;
  debit_total?: number | string | null;
  credit_total?: number | string | null;
  voucher_date?: string | null;
};

function asNumber(value: number | string | null | undefined): number {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function hasType(row: TallyMetricRow, type: string): boolean {
  return (row.voucher_type || "").toLowerCase().includes(type);
}

function rowAmount(row: TallyMetricRow): number {
  const amount = asNumber(row.amount);
  if (amount !== 0) return Math.abs(amount);
  return Math.max(Math.abs(asNumber(row.debit_total)), Math.abs(asNumber(row.credit_total)));
}

export function buildCanonicalMetrics(rows: TallyMetricRow[]) {
  const sales = rows.filter((r) => hasType(r, "sales")).reduce((s, r) => s + rowAmount(r), 0);
  const purchase = rows.filter((r) => hasType(r, "purchase")).reduce((s, r) => s + rowAmount(r), 0);
  const receipts = rows.filter((r) => hasType(r, "receipt")).reduce((s, r) => s + rowAmount(r), 0);
  const payments = rows.filter((r) => hasType(r, "payment")).reduce((s, r) => s + rowAmount(r), 0);
  const cashflow = receipts - payments;
  const grossProfit = sales - purchase;

  return {
    total_sales: sales,
    total_purchase: purchase,
    total_receipts: receipts,
    total_payments: payments,
    cashflow,
    gross_profit: grossProfit,
    net_profit: grossProfit,
    formula_version: "tly04_v1",
    caveats: {
      net_profit: "Uses sales minus purchase until Tally Profit and Loss report is synced.",
      balance_sheet: "Unavailable until Tally Balance Sheet report is synced.",
    },
  };
}
