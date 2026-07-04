export type TallyDateRange = {
  company: string;
  from: string;
  to: string;
};

export type TallyReportKey =
  | "sales"
  | "purchase"
  | "receipt"
  | "payment"
  | "journal"
  | "contra"
  | "debit_note"
  | "credit_note"
  | "bank_cash"
  | "ledger"
  | "profit_loss"
  | "balance_sheet"
  | "receivables"
  | "payables"
  | "expenses"
  | "party_summary"
  | "party_withdrawal";

export const TALLY_REPORT_KEYS: TallyReportKey[] = [
  "sales",
  "purchase",
  "receipt",
  "payment",
  "journal",
  "contra",
  "debit_note",
  "credit_note",
  "bank_cash",
  "ledger",
  "profit_loss",
  "balance_sheet",
  "receivables",
  "payables",
  "expenses",
  "party_summary",
  "party_withdrawal",
];

export function normalizeTallyReportKey(value: string | null | undefined): TallyReportKey {
  const normalized = (value || "sales").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return TALLY_REPORT_KEYS.includes(normalized as TallyReportKey) ? (normalized as TallyReportKey) : "sales";
}

export type CanonicalVoucher = {
  company: string;
  voucher_key: string;
  voucher_guid: string | null;
  voucher_no: string | null;
  voucher_type: string | null;
  voucher_date: string | null;
  party_name: string | null;
  ledger_name: string | null;
  reference: string | null;
  narration: string | null;
  gst_no: string | null;
  amount: number;
  debit_total: number;
  credit_total: number;
  source_report: string;
  raw_payload: Record<string, unknown>;
};

export type CanonicalVoucherLine = {
  company: string;
  voucher_key: string;
  voucher_no: string | null;
  voucher_type: string | null;
  voucher_date: string | null;
  ledger_name: string | null;
  party_name: string | null;
  line_type: string | null;
  amount: number;
  debit: number;
  credit: number;
  item_name: string | null;
  quantity: number | null;
  rate: number | null;
  gst_rate: number | null;
  tax_amount: number | null;
  raw_payload: Record<string, unknown>;
};

export type CanonicalLedger = {
  company: string;
  ledger_name: string;
  parent: string | null;
  group_name: string | null;
  opening_balance: number | null;
  closing_balance: number | null;
  debit_total: number;
  credit_total: number;
  gst_no: string | null;
  is_bank: boolean;
  is_cash: boolean;
  is_party: boolean;
  raw_payload: Record<string, unknown>;
};

export type CanonicalParty = {
  company: string;
  party_name: string;
  party_type: string | null;
  ledger_name: string | null;
  gst_no: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  opening_balance: number | null;
  closing_balance: number | null;
  receivable_total: number;
  payable_total: number;
  raw_payload: Record<string, unknown>;
};

export type ParsedTallyReport = {
  report: TallyReportKey;
  company: string;
  from: string;
  to: string;
  rawXml: string;
  vouchers: CanonicalVoucher[];
  lines: CanonicalVoucherLine[];
  ledgers: CanonicalLedger[];
  parties: CanonicalParty[];
  missingFieldCount: number;
  missingFields: Array<{
    entity: "voucher" | "line" | "ledger" | "party" | "report";
    key: string;
    fields: string[];
  }>;
};
