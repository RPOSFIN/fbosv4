import {
  buildTallySuggestion,
  recordTallyDiagnostic,
  type DiagnosticInput,
} from "@/lib/tally/canonical/diagnostics";

export const EXPECTED_SALES_INVOICE_COUNT = 778;

export async function recordTallyIssue(input: DiagnosticInput) {
  return recordTallyDiagnostic({
    ...input,
    suggestion: input.suggestion || buildTallySuggestion(input.issue),
  });
}

export async function recordSalesCountDiagnostic(input: {
  company: string;
  from: string;
  to: string;
  actualCount: number;
  requestEvidence: Record<string, unknown>;
}) {
  if (input.actualCount === EXPECTED_SALES_INVOICE_COUNT) return null;

  return recordTallyIssue({
    severity: "warning",
    module: "tally.sales",
    issue: "Sales invoice count mismatch",
    evidence: {
      company: input.company,
      from: input.from,
      to: input.to,
      expected_count: EXPECTED_SALES_INVOICE_COUNT,
      actual_count: input.actualCount,
      request: input.requestEvidence,
    },
    suggestion:
      "Compare the same date range in Tally Sales Register, then inspect the XML voucher filters and company name.",
  });
}
