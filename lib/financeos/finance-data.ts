import type { FinanceAlert, FinanceDashboardData, FinanceHealth, FinanceMetric, FinanceModule } from "./finance-types";

export const financeNavigation = [
  ["Dashboard", "/finance"],
  ["Transactions", "/finance/transactions"],
  ["Ledgers", "/finance/ledgers"],
  ["Receivables", "/finance/receivables"],
  ["Payables", "/finance/payables"],
  ["Cash Flow", "/finance/cash-flow"],
  ["Balance Sheet", "/finance/balance-sheet"],
  ["Profit & Loss", "/finance/profit-loss"],
  ["Shark Tank India Matrix", "/finance/shark-tank-matrix"],
  ["Bank Loan Matrix", "/finance/bank-loan-matrix"],
  ["Expense Heads", "/finance/expense-heads"],
  ["Owner Finance", "/finance/owner-finance"],
  ["Reports", "/finance/reports"],
  ["Audit", "/finance/audit"],
  ["Settings", "/finance/settings"],
] as const;

export const dashboardKpis: FinanceMetric[] = [
  "Sales", "Purchase", "Receipts", "Payments", "Receivables", "Payables", "Cash in Bank", "Cash in Hand",
  "Free Cash", "Working Capital", "Net Worth", "Monthly Profit", "Monthly Expenses", "Outstanding", "Credit Utilization",
].map((label) => ({
  id: label.toLowerCase().replaceAll(" ", "-"),
  label,
  value: null,
  tone: "info",
  description: "Connect Supabase summary data to enable this metric.",
}));

export const healthCards: FinanceHealth[] = [
  "Cash Health", "Profit Health", "Business Health", "Liquidity Score", "AI Financial Score",
  "Debt Health", "Receivable Health", "Expense Trend", "Monthly Growth", "Yearly Growth",
].map((label) => ({
  id: label.toLowerCase().replaceAll(" ", "-"),
  label,
  score: null,
  tone: "neutral",
  status: "Data required",
  action: "Connect the related Supabase view to calculate this score.",
}));

export const financeAlerts: FinanceAlert[] = [
  { id: "ssot", title: "Supabase source pending", body: "FinanceOS UI is ready for summary views. Live values appear after source views are connected.", tone: "info" },
  { id: "sync", title: "Sync source required", body: "Use existing finance and ledger sources for vouchers, ledgers, receivables and payables.", tone: "warning" },
];

export const initialFinanceDashboard: FinanceDashboardData = {
  financialYear: "FY 2026-27",
  currentMonth: "July 2026",
  lastSync: null,
  supabaseStatus: "Needs configuration",
  tallyStatus: "Needs configuration",
  kpis: dashboardKpis,
  health: healthCards,
  alerts: financeAlerts,
};

export const financeModules: Record<string, FinanceModule> = {
  transactions: moduleConfig("transactions", "Transactions", "Voucher control", ["Date", "Voucher", "Ledger", "Type", "Debit", "Credit", "Status"]),
  ledgers: moduleConfig("ledgers", "Ledgers", "Ledger intelligence", ["Ledger", "Group", "Opening", "Debit", "Credit", "Closing", "Review"]),
  receivables: moduleConfig("receivables", "Receivables", "Cash collection", ["Party", "Owner", "Age", "Amount", "Risk", "Action"]),
  payables: moduleConfig("payables", "Payables", "Payment control", ["Party", "Owner", "Age", "Amount", "Due", "Priority"]),
  "cash-flow": moduleConfig("cash-flow", "Cash Flow", "Liquidity movement", ["Period", "Opening", "Inflow", "Outflow", "Closing", "Free Cash"]),
  "balance-sheet": moduleConfig("balance-sheet", "Balance Sheet", "Financial position", ["Section", "Group", "Ledger", "Amount", "Drill Down"]),
  "profit-loss": moduleConfig("profit-loss", "Profit & Loss", "Profit engine", ["Head", "Current Month", "Previous Month", "Change", "Margin"]),
  "shark-tank-matrix": moduleConfig("shark-tank-matrix", "Shark Tank India Matrix", "Investment readiness", ["Metric", "Value", "Score", "Risk", "Recommendation"]),
  "bank-loan-matrix": moduleConfig("bank-loan-matrix", "Bank Loan Matrix", "Debt command", ["Bank", "Loan", "Outstanding", "Rate", "EMI", "Due Date", "Health"]),
  "expense-heads": moduleConfig("expense-heads", "Expense Heads", "Expense control", ["Head/User", "Limit", "Used", "Remaining", "Usage", "Warning", "Override"]),
  "owner-finance": moduleConfig("owner-finance", "Owner Finance", "Owner visibility", ["Owner", "Receivables", "Payables", "Expenses", "Withdrawals", "Net"]),
  reports: moduleConfig("reports", "Reports", "Exports", ["Report", "Period", "Rows", "Status", "Export"]),
  audit: moduleConfig("audit", "Audit", "Control room", ["Time", "Source", "Issue", "Severity", "Owner", "Status"]),
  settings: moduleConfig("settings", "Settings", "FinanceOS control", ["Setting", "Value", "Scope", "Updated By", "Action"]),
};

function moduleConfig(slug: string, title: string, eyebrow: string, tableColumns: string[]): FinanceModule {
  return {
    slug,
    title,
    eyebrow,
    description: `${title} command view for FinanceOS V3 with cards, drill-down table, exports and source status.`,
    tableColumns,
    sourceHint: "Supabase FinanceOS source view",
    metrics: [
      { id: `${slug}-value`, label: "Primary Value", value: null, tone: "info", description: "Source connection required." },
      { id: `${slug}-score`, label: "Health Score", value: null, suffix: "/100", tone: "insight", description: "Calculated after source data is available." },
      { id: `${slug}-pending`, label: "Pending Actions", value: null, tone: "warning", description: "Pending review or mapping actions." },
    ],
  };
}
