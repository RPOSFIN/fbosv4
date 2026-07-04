export type CanonicalVoucherMetricRow = {
  id?: string;
  voucher_no?: string | null;
  voucher_type?: string | null;
  voucher_date?: string | null;
  party_name?: string | null;
  ledger_name?: string | null;
  reference?: string | null;
  narration?: string | null;
  amount?: number | string | null;
  debit_total?: number | string | null;
  credit_total?: number | string | null;
};

export type CanonicalLineMetricRow = {
  voucher_no?: string | null;
  voucher_type?: string | null;
  voucher_date?: string | null;
  party_name?: string | null;
  ledger_name?: string | null;
  reference?: string | null;
  narration?: string | null;
  amount?: number | string | null;
  debit?: number | string | null;
  credit?: number | string | null;
};

export type CanonicalExpenseSummaryRow = {
  company: string;
  from_date: string;
  to_date: string;
  party_name: string | null;
  ledger_name: string | null;
  category: string | null;
  voucher_count: number;
  total_debit: number;
  total_credit: number;
  total_amount: number;
  month: string | null;
};

function asNumber(value: number | string | null | undefined): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function absAmount(row: {
  amount?: number | string | null;
  debit_total?: number | string | null;
  credit_total?: number | string | null;
  debit?: number | string | null;
  credit?: number | string | null;
}): number {
  const amount = asNumber(row.amount);
  if (amount !== 0) return Math.abs(amount);
  return Math.max(
    Math.abs(asNumber(row.debit_total)),
    Math.abs(asNumber(row.credit_total)),
    Math.abs(asNumber(row.debit)),
    Math.abs(asNumber(row.credit))
  );
}

function hasVoucherType(row: { voucher_type?: string | null }, type: string): boolean {
  return (row.voucher_type || "").toLowerCase().includes(type.toLowerCase());
}

function voucherText(row: {
  voucher_no?: string | null;
  reference?: string | null;
  narration?: string | null;
  voucher_type?: string | null;
}): string {
  return [row.voucher_no, row.reference, row.narration, row.voucher_type]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
}

export function isProformaVoucher(row: {
  voucher_no?: string | null;
  reference?: string | null;
  narration?: string | null;
  voucher_type?: string | null;
}): boolean {
  return voucherText(row).includes("PROFORMA");
}

export function isRealSalesVoucher(row: CanonicalVoucherMetricRow): boolean {
  return hasVoucherType(row, "sales") && !isProformaVoucher(row) && absAmount(row) > 0;
}

function isBankOrCashLedger(ledgerName: string | null | undefined): boolean {
  const text = (ledgerName || "").toLowerCase();
  return (
    text.includes("bank") ||
    text.includes("cash") ||
    text.includes("hdfc") ||
    text.includes("icici") ||
    text.includes("axis") ||
    text.includes("sbi") ||
    text.includes("kotak")
  );
}

function monthKey(date: string | null | undefined): string | null {
  return date ? date.slice(0, 7) : null;
}

function sumByType(rows: CanonicalVoucherMetricRow[], type: string): number {
  return rows
    .filter((row) => {
      if (type.toLowerCase() === "sales") return isRealSalesVoucher(row);
      return hasVoucherType(row, type);
    })
    .reduce((sum, row) => sum + absAmount(row), 0);
}

export function buildCanonicalFinanceSummary(
  vouchers: CanonicalVoucherMetricRow[],
  lines: CanonicalLineMetricRow[] = []
) {
  const total_sales = sumByType(vouchers, "sales");
  const total_purchase = sumByType(vouchers, "purchase");
  const total_receipts = sumByType(vouchers, "receipt");
  const total_payments = sumByType(vouchers, "payment");
  const bankLines = lines.filter((line) => isBankOrCashLedger(line.ledger_name));
  const cashLines = bankLines.filter((line) => (line.ledger_name || "").toLowerCase().includes("cash"));
  const nonCashBankLines = bankLines.filter((line) => !cashLines.includes(line));
  const cash_in = cashLines.reduce((sum, line) => sum + asNumber(line.credit), 0);
  const cash_out = cashLines.reduce((sum, line) => sum + asNumber(line.debit), 0);
  const bank_in = nonCashBankLines.reduce((sum, line) => sum + asNumber(line.credit), 0);
  const bank_out = nonCashBankLines.reduce((sum, line) => sum + asNumber(line.debit), 0);
  const receivables = total_sales - total_receipts;
  const payables = total_purchase - total_payments;
  const gross_profit = total_sales - total_purchase;
  const cashflow = total_receipts - total_payments;

  return {
    total_sales,
    total_purchase,
    total_receipts,
    total_payments,
    receivables,
    payables,
    cash_in,
    cash_out,
    bank_in,
    bank_out,
    gross_profit,
    net_profit: gross_profit,
    cashflow,
    formula_version: "tly04_v2_excludes_proforma_sales",
    caveats: {
      sales:
        "Sales excludes proforma vouchers and zero-value proforma rows. Proforma invoices are not commercial sales.",
      receivables:
        "Uses sales minus receipts unless a Tally outstanding receivables report is synced.",
      payables:
        "Uses purchase minus payments unless a Tally outstanding payables report is synced.",
      net_profit:
        "Uses sales minus purchases until a structured Tally Profit and Loss summary is available.",
      balance_sheet: "Balance Sheet values are unavailable unless Tally returns a structured report.",
    },
  };
}

export function buildTimeSeries(rows: CanonicalVoucherMetricRow[]) {
  const byMonth = new Map<
    string,
    {
      month: string;
      sales: number;
      purchases: number;
      receipts: number;
      payments: number;
      profit: number;
    }
  >();

  for (const row of rows) {
    const key = monthKey(row.voucher_date);
    if (!key) continue;
    const current =
      byMonth.get(key) ||
      {
        month: key,
        sales: 0,
        purchases: 0,
        receipts: 0,
        payments: 0,
        profit: 0,
      };
    const value = absAmount(row);
    if (isRealSalesVoucher(row)) current.sales += value;
    if (hasVoucherType(row, "purchase")) current.purchases += value;
    if (hasVoucherType(row, "receipt")) current.receipts += value;
    if (hasVoucherType(row, "payment")) current.payments += value;
    current.profit = current.sales - current.purchases;
    byMonth.set(key, current);
  }

  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function buildExpenseSummaryRows(input: {
  company: string;
  from: string;
  to: string;
  lines: CanonicalLineMetricRow[];
}): CanonicalExpenseSummaryRow[] {
  const grouped = new Map<string, CanonicalExpenseSummaryRow>();
  const expenseLines = input.lines.filter((line) => {
    const type = (line.voucher_type || "").toLowerCase();
    if (isBankOrCashLedger(line.ledger_name)) return false;
    return (
      type.includes("payment") ||
      type.includes("purchase") ||
      type.includes("journal") ||
      asNumber(line.debit) > 0
    );
  });

  for (const line of expenseLines) {
    const month = monthKey(line.voucher_date);
    const key = [
      line.party_name || "",
      line.ledger_name || "",
      month || "",
    ].join("|");
    const current =
      grouped.get(key) ||
      {
        company: input.company,
        from_date: input.from,
        to_date: input.to,
        party_name: line.party_name || null,
        ledger_name: line.ledger_name || null,
        category: line.ledger_name || null,
        voucher_count: 0,
        total_debit: 0,
        total_credit: 0,
        total_amount: 0,
        month: month ? `${month}-01` : null,
      };
    current.voucher_count += 1;
    current.total_debit += asNumber(line.debit);
    current.total_credit += asNumber(line.credit);
    current.total_amount += absAmount(line);
    grouped.set(key, current);
  }

  return [...grouped.values()].sort((a, b) => b.total_amount - a.total_amount);
}
