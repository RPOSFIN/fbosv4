export function safeNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function safeDivide(numerator: number | null | undefined, denominator: number | null | undefined) {
  const n = safeNumber(numerator);
  const d = safeNumber(denominator);
  if (n === null || d === null || d === 0) return null;
  return n / d;
}

export function workingCapital(currentAssets: number | null, currentLiabilities: number | null) {
  if (currentAssets === null || currentLiabilities === null) return null;
  return currentAssets - currentLiabilities;
}

export function currentRatio(currentAssets: number | null, currentLiabilities: number | null) {
  return safeDivide(currentAssets, currentLiabilities);
}

export function quickRatio(cash: number | null, receivables: number | null, currentLiabilities: number | null) {
  if (cash === null || receivables === null) return null;
  return safeDivide(cash + receivables, currentLiabilities);
}

export function debtEquityRatio(totalDebt: number | null, equity: number | null) {
  return safeDivide(totalDebt, equity);
}

export function dscr(netOperatingIncome: number | null, debtService: number | null) {
  return safeDivide(netOperatingIncome, debtService);
}

export function creditUtilization(usedLimit: number | null, totalLimit: number | null) {
  const ratio = safeDivide(usedLimit, totalLimit);
  return ratio === null ? null : ratio * 100;
}

export function liquidityScore(currentRatioValue: number | null, quickRatioValue: number | null) {
  if (currentRatioValue === null || quickRatioValue === null) return null;
  const currentScore = Math.min(currentRatioValue / 2, 1) * 50;
  const quickScore = Math.min(quickRatioValue / 1, 1) * 50;
  return Math.round(currentScore + quickScore);
}

export function scoreStatus(score: number | null) {
  if (score === null) return { label: "Data required", tone: "neutral" as const };
  if (score >= 80) return { label: "Strong", tone: "positive" as const };
  if (score >= 60) return { label: "Stable", tone: "info" as const };
  if (score >= 40) return { label: "Watch", tone: "warning" as const };
  return { label: "Risk", tone: "negative" as const };
}

export function formatInr(value: number | null) {
  if (value === null) return "Data required";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
