import {
  TALLY_REPORT_KEYS,
  type TallyReportKey,
} from "@/lib/tally/canonical/tally-types";

export type TallyReportDefinition = {
  key: TallyReportKey;
  label: string;
  tallyReportName: string;
  voucherType?: string;
  category:
    | "voucher"
    | "ledger"
    | "financial_statement"
    | "outstanding"
    | "summary";
};

export const TALLY_REPORT_DEFINITIONS: Record<TallyReportKey, TallyReportDefinition> = {
  sales: {
    key: "sales",
    label: "Sales",
    tallyReportName: "Voucher Register",
    voucherType: "Sales",
    category: "voucher",
  },
  purchase: {
    key: "purchase",
    label: "Purchase",
    tallyReportName: "Voucher Register",
    voucherType: "Purchase",
    category: "voucher",
  },
  receipt: {
    key: "receipt",
    label: "Receipt",
    tallyReportName: "Voucher Register",
    voucherType: "Receipt",
    category: "voucher",
  },
  payment: {
    key: "payment",
    label: "Payment",
    tallyReportName: "Voucher Register",
    voucherType: "Payment",
    category: "voucher",
  },
  journal: {
    key: "journal",
    label: "Journal",
    tallyReportName: "Voucher Register",
    voucherType: "Journal",
    category: "voucher",
  },
  contra: {
    key: "contra",
    label: "Contra",
    tallyReportName: "Voucher Register",
    voucherType: "Contra",
    category: "voucher",
  },
  debit_note: {
    key: "debit_note",
    label: "Debit Note",
    tallyReportName: "Voucher Register",
    voucherType: "Debit Note",
    category: "voucher",
  },
  credit_note: {
    key: "credit_note",
    label: "Credit Note",
    tallyReportName: "Voucher Register",
    voucherType: "Credit Note",
    category: "voucher",
  },
  bank_cash: {
    key: "bank_cash",
    label: "Bank/Cash",
    tallyReportName: "Bank Book",
    category: "summary",
  },
  ledger: {
    key: "ledger",
    label: "Ledger",
    tallyReportName: "List of Ledgers",
    category: "ledger",
  },
  profit_loss: {
    key: "profit_loss",
    label: "Profit & Loss",
    tallyReportName: "Profit and Loss",
    category: "financial_statement",
  },
  balance_sheet: {
    key: "balance_sheet",
    label: "Balance Sheet",
    tallyReportName: "Balance Sheet",
    category: "financial_statement",
  },
  receivables: {
    key: "receivables",
    label: "Receivables",
    tallyReportName: "Bills Receivable",
    category: "outstanding",
  },
  payables: {
    key: "payables",
    label: "Payables",
    tallyReportName: "Bills Payable",
    category: "outstanding",
  },
  expenses: {
    key: "expenses",
    label: "Expenses",
    tallyReportName: "Voucher Register",
    voucherType: "Payment",
    category: "voucher",
  },
  party_summary: {
    key: "party_summary",
    label: "Party Summary",
    tallyReportName: "Ledger Vouchers",
    category: "summary",
  },
  party_withdrawal: {
    key: "party_withdrawal",
    label: "Person/Vendor Withdrawal Summary",
    tallyReportName: "Ledger Vouchers",
    category: "summary",
  },
};

export function listTallyReportDefinitions(): TallyReportDefinition[] {
  return TALLY_REPORT_KEYS.map((key) => TALLY_REPORT_DEFINITIONS[key]);
}

export function getTallyReportDefinition(
  key: TallyReportKey
): TallyReportDefinition {
  return TALLY_REPORT_DEFINITIONS[key];
}
