export type FinanceTone = "positive" | "negative" | "info" | "warning" | "insight" | "neutral";

export type FinanceMetric = {
  id: string;
  label: string;
  value: number | null;
  suffix?: string;
  prefix?: string;
  changePercent?: number | null;
  tone: FinanceTone;
  description: string;
  route?: string;
};

export type FinanceHealth = {
  id: string;
  label: string;
  score: number | null;
  tone: FinanceTone;
  status: string;
  action: string;
};

export type FinanceChartPoint = {
  label: string;
  value: number | null;
  secondaryValue?: number | null;
};

export type FinanceModule = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  metrics: FinanceMetric[];
  tableColumns: string[];
  sourceHint: string;
};

export type FinanceAlert = {
  id: string;
  title: string;
  body: string;
  tone: FinanceTone;
};

export type FinanceDashboardData = {
  financialYear: string;
  currentMonth: string;
  lastSync: string | null;
  supabaseStatus: "Connected" | "Needs configuration";
  tallyStatus: "Synced" | "Pending sync" | "Needs configuration";
  kpis: FinanceMetric[];
  health: FinanceHealth[];
  alerts: FinanceAlert[];
};
