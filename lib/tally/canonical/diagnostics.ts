import { getAdminClient } from "@/lib/supabase/admin";

export type DiagnosticInput = {
  severity?: "info" | "warning" | "error" | "critical";
  module?: string;
  issue: string;
  evidence?: Record<string, unknown>;
  suggestion?: string;
};

export async function recordTallyDiagnostic(input: DiagnosticInput) {
  const supabase = getAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("tally_ai_diagnostics")
    .insert({
      severity: input.severity || "warning",
      module: input.module || "tally",
      issue: input.issue,
      evidence: input.evidence || {},
      suggestion: input.suggestion || null,
      status: "open",
    })
    .select("id")
    .single();

  if (error) {
    console.warn("[tally diagnostics]", error.message);
    return null;
  }
  return data?.id || null;
}

export function buildTallySuggestion(issue: string): string {
  const lower = issue.toLowerCase();
  if (lower.includes("timeout")) return "Check Tally XML gateway reachability, firewall, and TALLY_TIMEOUT_MS.";
  if (lower.includes("zero")) return "Verify company, date range, and report type in Tally. Confirm XML export includes this report.";
  if (lower.includes("missing")) return "Check the XML fetch list and parser field mapping for the affected report.";
  if (lower.includes("count")) return "Compare the same company and date range in Tally with the canonical Supabase count.";
  return "Review Tally gateway response, parser output, and canonical table mapping.";
}
