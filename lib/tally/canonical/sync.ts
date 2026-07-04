import { getAdminClient } from "@/lib/supabase/admin";
import { sendTallyRequest, tallyClient } from "@/lib/integrations/tally-client";
import { getResolvedTallyConfig } from "@/lib/integrations/tally-config";
import {
  normalizeTallyReportKey,
  TALLY_REPORT_KEYS,
  type ParsedTallyReport,
  type TallyReportKey,
} from "@/lib/tally/canonical/tally-types";
import { buildTallyXmlRequest } from "@/lib/tally/reports/xml-builders";
import { parseCanonicalTallyXml } from "@/lib/tally/parser/canonical-parser";
import {
  buildCanonicalFinanceSummary,
  buildExpenseSummaryRows,
  type CanonicalLineMetricRow,
  type CanonicalVoucherMetricRow,
} from "@/lib/tally/formulas/canonical-finance";
import {
  EXPECTED_SALES_INVOICE_COUNT,
  recordSalesCountDiagnostic,
  recordTallyIssue,
} from "@/lib/tally/diagnostics/tally-diagnostics";

type SyncCounts = Record<string, number>;

export type CanonicalTallySyncInput = {
  from?: string | null;
  to?: string | null;
  reports?: string[] | string | null;
  party?: string | null;
  ledger?: string | null;
};

export type CanonicalTallySyncResult = {
  ok: boolean;
  status: "success" | "partial_success" | "failed";
  sync_run_id: string | null;
  company: string;
  from: string;
  to: string;
  requested_reports: TallyReportKey[];
  parsed_counts: SyncCounts;
  inserted_counts: SyncCounts;
  updated_counts: SyncCounts;
  replaced_counts: SyncCounts;
  errors: Array<Record<string, unknown>>;
  ai_suggestions: string[];
  invoice_check?: {
    expected: number;
    actual: number;
    status: "matched" | "mismatch";
  };
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDate(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  if (value === "today") return today();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString().slice(0, 10);
}

function normalizeReports(value: CanonicalTallySyncInput["reports"]): TallyReportKey[] {
  if (!value) return [...TALLY_REPORT_KEYS];
  const raw = Array.isArray(value) ? value : value.split(",");
  const reports = raw
    .map((item) => normalizeTallyReportKey(item))
    .filter((item, index, all) => all.indexOf(item) === index);
  return reports.length ? reports : [...TALLY_REPORT_KEYS];
}

function chunk<T>(items: T[], size = 500): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function createRun(input: {
  company: string;
  host: string | null;
  port: number | null;
  from: string;
  to: string;
  reports: TallyReportKey[];
}) {
  const supabase = getAdminClient();
  if (!supabase) return { supabase: null, runId: null };

  const { data, error } = await supabase
    .from("tally_sync_runs")
    .insert({
      status: "running",
      company: input.company,
      host: input.host,
      port: input.port,
      from_date: input.from,
      to_date: input.to,
      requested_reports: input.reports,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { supabase, runId: data?.id as string };
}

async function finishRun(
  runId: string | null,
  payload: Omit<CanonicalTallySyncResult, "ok" | "sync_run_id" | "company" | "from" | "to" | "requested_reports">
) {
  const supabase = getAdminClient();
  if (!supabase || !runId) return;

  await supabase
    .from("tally_sync_runs")
    .update({
      status: payload.status,
      finished_at: new Date().toISOString(),
      parsed_counts: payload.parsed_counts,
      inserted_counts: payload.inserted_counts,
      updated_counts: payload.updated_counts,
      replaced_counts: payload.replaced_counts,
      error_count: payload.errors.length,
      errors: payload.errors,
      ai_suggestions: payload.ai_suggestions,
    })
    .eq("id", runId);
}

async function upsertParsedReport(parsed: ParsedTallyReport, runId: string) {
  const supabase = getAdminClient();
  if (!supabase) throw new Error("Database not configured");

  const inserted: SyncCounts = {};
  const replaced: SyncCounts = {};

  await supabase.from("tally_companies").upsert(
    {
      company: parsed.company,
      raw_payload: { source: "canonical_tally_sync" },
      last_sync_run_id: runId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company" }
  );

  if (parsed.ledgers.length) {
    for (const batch of chunk(parsed.ledgers)) {
      const { error } = await supabase.from("tally_ledgers").upsert(
        batch.map((ledger) => ({
          ...ledger,
          last_sync_run_id: runId,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "company,ledger_name" }
      );
      if (error) throw new Error(error.message);
      inserted.ledgers = (inserted.ledgers || 0) + batch.length;
    }
  }

  if (parsed.parties.length) {
    for (const batch of chunk(parsed.parties)) {
      const { error } = await supabase.from("tally_parties").upsert(
        batch.map((party) => ({
          ...party,
          last_sync_run_id: runId,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "company,party_name" }
      );
      if (error) throw new Error(error.message);
      inserted.parties = (inserted.parties || 0) + batch.length;
    }
  }

  if (parsed.vouchers.length) {
    for (const batch of chunk(parsed.vouchers, 250)) {
      const { data, error } = await supabase
        .from("tally_vouchers")
        .upsert(
          batch.map((voucher) => ({
            ...voucher,
            last_sync_run_id: runId,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "company,voucher_key" }
        )
        .select("id,voucher_key");

      if (error) throw new Error(error.message);
      inserted.vouchers = (inserted.vouchers || 0) + batch.length;

      const idsByKey = new Map<string, string>(
        ((data || []) as Array<{ id: string; voucher_key: string }>).map((row) => [
          row.voucher_key,
          row.id,
        ])
      );
      const voucherIds = [...idsByKey.values()];

      if (voucherIds.length) {
        const { count } = await supabase
          .from("tally_voucher_lines")
          .delete({ count: "exact" })
          .in("voucher_id", voucherIds);
        replaced.voucher_lines = (replaced.voucher_lines || 0) + (count || 0);
      }

      const linePayload = parsed.lines
        .filter((line) => idsByKey.has(line.voucher_key))
        .map((line) => {
          const { voucher_key: _voucherKey, ...rest } = line;
          return {
            ...rest,
            voucher_id: idsByKey.get(line.voucher_key),
            last_sync_run_id: runId,
          };
        });

      if (linePayload.length) {
        for (const lineBatch of chunk(linePayload)) {
          const { error: lineError } = await supabase
            .from("tally_voucher_lines")
            .insert(lineBatch);
          if (lineError) throw new Error(lineError.message);
          inserted.voucher_lines = (inserted.voucher_lines || 0) + lineBatch.length;
        }
      }
    }
  }

  const { error: reportError } = await supabase.from("tally_reports").upsert(
    {
      company: parsed.company,
      report_type: parsed.report,
      from_date: parsed.from,
      to_date: parsed.to,
      data: parsed.vouchers.slice(0, 1000),
      summary: {
        vouchers: parsed.vouchers.length,
        voucher_lines: parsed.lines.length,
        ledgers: parsed.ledgers.length,
        parties: parsed.parties.length,
        missing_fields: parsed.missingFields,
        raw_xml_preview: parsed.rawXml.slice(0, 4000),
      },
      row_count: Math.max(parsed.vouchers.length, parsed.ledgers.length),
      missing_field_count: parsed.missingFieldCount,
      generated_at: new Date().toISOString(),
      last_sync_run_id: runId,
    },
    { onConflict: "company,report_type,from_date,to_date" }
  );
  if (reportError) throw new Error(reportError.message);
  inserted.reports = (inserted.reports || 0) + 1;

  return { inserted, replaced };
}

async function loadMetrics(company: string, from: string, to: string) {
  const supabase = getAdminClient();
  if (!supabase) throw new Error("Database not configured");

  const { data: vouchers, error: voucherError } = await supabase
    .from("tally_vouchers")
    .select("id, voucher_type, voucher_date, party_name, ledger_name, amount, debit_total, credit_total")
    .eq("company", company)
    .gte("voucher_date", from)
    .lte("voucher_date", to)
    .limit(20000);
  if (voucherError) throw new Error(voucherError.message);

  const { data: lines, error: lineError } = await supabase
    .from("tally_voucher_lines")
    .select("voucher_type, voucher_date, party_name, ledger_name, amount, debit, credit")
    .eq("company", company)
    .gte("voucher_date", from)
    .lte("voucher_date", to)
    .limit(40000);
  if (lineError) throw new Error(lineError.message);

  return {
    vouchers: (vouchers || []) as CanonicalVoucherMetricRow[],
    lines: (lines || []) as CanonicalLineMetricRow[],
  };
}

async function persistDerivedTables(input: {
  company: string;
  from: string;
  to: string;
  runId: string;
}) {
  const supabase = getAdminClient();
  if (!supabase) throw new Error("Database not configured");

  const metricsRows = await loadMetrics(input.company, input.from, input.to);
  const metrics = buildCanonicalFinanceSummary(metricsRows.vouchers, metricsRows.lines);
  const expenseRows = buildExpenseSummaryRows({
    company: input.company,
    from: input.from,
    to: input.to,
    lines: metricsRows.lines,
  });

  const { error: metricError } = await supabase.from("tally_finance_metrics").upsert(
    {
      company: input.company,
      from_date: input.from,
      to_date: input.to,
      total_sales: metrics.total_sales,
      total_purchase: metrics.total_purchase,
      total_receipts: metrics.total_receipts,
      total_payments: metrics.total_payments,
      receivables: metrics.receivables,
      payables: metrics.payables,
      cash_in: metrics.cash_in,
      cash_out: metrics.cash_out,
      bank_in: metrics.bank_in,
      bank_out: metrics.bank_out,
      gross_profit: metrics.gross_profit,
      net_profit: metrics.net_profit,
      cashflow: metrics.cashflow,
      source: "canonical_tally",
      formula_version: metrics.formula_version,
      generated_at: new Date().toISOString(),
      last_sync_run_id: input.runId,
    },
    { onConflict: "company,from_date,to_date,formula_version" }
  );
  if (metricError) throw new Error(metricError.message);

  await supabase
    .from("tally_expense_summary")
    .delete()
    .eq("company", input.company)
    .gte("month", `${input.from.slice(0, 7)}-01`)
    .lte("month", `${input.to.slice(0, 7)}-31`);

  if (expenseRows.length) {
    for (const batch of chunk(expenseRows)) {
      const { error } = await supabase.from("tally_expense_summary").insert(
        batch.map((row) => ({
          ...row,
          last_sync_run_id: input.runId,
        }))
      );
      if (error) throw new Error(error.message);
    }
  }

  return {
    metrics: 1,
    expense_summary: expenseRows.length,
  };
}

async function salesCount(company: string, from: string, to: string): Promise<number> {
  const supabase = getAdminClient();
  if (!supabase) return 0;
  const { count } = await supabase
    .from("tally_vouchers")
    .select("id", { count: "exact", head: true })
    .eq("company", company)
    .ilike("voucher_type", "%Sales%")
    .gte("voucher_date", from)
    .lte("voucher_date", to);
  return count || 0;
}

function mergeCounts(target: SyncCounts, source: SyncCounts) {
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] || 0) + value;
  }
}

export async function syncCanonicalTally(
  input: CanonicalTallySyncInput = {}
): Promise<CanonicalTallySyncResult> {
  const from = normalizeDate(input.from, "2024-04-01");
  const to = normalizeDate(input.to, today());
  const reports = normalizeReports(input.reports);
  const resolved = await getResolvedTallyConfig();
  const config = await tallyClient.getResolvedConfig();
  const company = config?.companyName || resolved.company;
  const parsed_counts: SyncCounts = {};
  const inserted_counts: SyncCounts = {};
  const updated_counts: SyncCounts = {};
  const replaced_counts: SyncCounts = {};
  const errors: Array<Record<string, unknown>> = [];
  const ai_suggestions: string[] = [];
  let runId: string | null = null;

  const run = await createRun({
    company,
    host: config?.host || resolved.host || null,
    port: config?.port || Number(resolved.port) || null,
    from,
    to,
    reports,
  });
  runId = run.runId;

  if (!run.supabase) {
    return {
      ok: false,
      status: "failed",
      sync_run_id: null,
      company,
      from,
      to,
      requested_reports: reports,
      parsed_counts,
      inserted_counts,
      updated_counts,
      replaced_counts,
      errors: [{ issue: "Database not configured" }],
      ai_suggestions: ["Set Supabase URL and service role key for canonical writes."],
    };
  }

  if (!config) {
    const issue = "Tally host is not configured";
    errors.push({ issue, company, from, to });
    ai_suggestions.push("Set TALLY_HOST, TALLY_PORT, and TALLY_COMPANY_NAME for live canonical sync.");
    await recordTallyIssue({
      severity: "error",
      module: "tally.sync",
      issue,
      evidence: { company, from, to, reports },
    });
    const result = {
      status: "failed" as const,
      parsed_counts,
      inserted_counts,
      updated_counts,
      replaced_counts,
      errors,
      ai_suggestions,
    };
    await finishRun(runId, result);
    return {
      ok: false,
      sync_run_id: runId,
      company,
      from,
      to,
      requested_reports: reports,
      ...result,
    };
  }

  if (!runId) {
    return {
      ok: false,
      status: "failed",
      sync_run_id: null,
      company,
      from,
      to,
      requested_reports: reports,
      parsed_counts,
      inserted_counts,
      updated_counts,
      replaced_counts,
      errors: [{ issue: "Canonical sync run could not be created" }],
      ai_suggestions: ["Verify tally_sync_runs exists and Supabase writes are available."],
    };
  }

  for (const report of reports) {
    try {
      const xmlRequest = buildTallyXmlRequest({
        company: config.companyName,
        from,
        to,
        report,
        party: input.party,
        ledger: input.ledger,
      });
      const response = await sendTallyRequest(xmlRequest, config);

      if (!response?.success || typeof response.data !== "string") {
        const issue = response?.error || `Tally ${report} report request failed`;
        errors.push({
          report,
          issue,
          status: response?.status,
          endpoint: response?.endpoint,
        });
        ai_suggestions.push(`Check Tally gateway response for ${report}.`);
        await recordTallyIssue({
          severity: "error",
          module: `tally.${report}`,
          issue,
          evidence: {
            company: config.companyName,
            from,
            to,
            report,
            status: response?.status,
            endpoint: response?.endpoint,
          },
        });
        continue;
      }

      const parsed = parseCanonicalTallyXml({
        xml: response.data,
        report,
        company: config.companyName,
        from,
        to,
      });

      parsed_counts[report] = Math.max(
        parsed.vouchers.length,
        parsed.ledgers.length
      );

      if (parsed_counts[report] === 0) {
        const issue = `Tally ${report} report returned zero rows`;
        errors.push({ report, issue });
        ai_suggestions.push(`Verify ${report} exists in Tally for ${from} to ${to}.`);
        await recordTallyIssue({
          severity: "warning",
          module: `tally.${report}`,
          issue,
          evidence: {
            company: config.companyName,
            from,
            to,
            report,
            responsePreview: response.data.slice(0, 1000),
          },
        });
      }

      if (parsed.missingFieldCount > 0) {
        await recordTallyIssue({
          severity: "warning",
          module: `tally.${report}`,
          issue: `Tally ${report} XML missing canonical fields`,
          evidence: {
            company: config.companyName,
            from,
            to,
            report,
            missing_field_count: parsed.missingFieldCount,
            missing_fields: parsed.missingFields.slice(0, 50),
          },
          suggestion: "Review the report XML fetch list and parser mapping for missing canonical fields.",
        });
      }

      const persisted = await upsertParsedReport(parsed, runId);
      mergeCounts(inserted_counts, persisted.inserted);
      mergeCounts(replaced_counts, persisted.replaced);
    } catch (error) {
      const issue = errorMessage(error);
      errors.push({ report, issue });
      ai_suggestions.push(`Fix ${report} sync failure: ${issue}`);
      await recordTallyIssue({
        severity: "error",
        module: `tally.${report}`,
        issue,
        evidence: { company: config.companyName, from, to, report },
      });
    }
  }

  try {
    const derived = await persistDerivedTables({
      company: config.companyName,
      from,
      to,
      runId,
    });
    mergeCounts(inserted_counts, derived);
  } catch (error) {
    const issue = errorMessage(error);
    errors.push({ report: "derived_tables", issue });
    ai_suggestions.push(`Review canonical formula persistence: ${issue}`);
  }

  let invoice_check: CanonicalTallySyncResult["invoice_check"];
  if (reports.includes("sales") && from <= "2024-04-01") {
    const actual = await salesCount(config.companyName, "2024-04-01", to);
    invoice_check = {
      expected: EXPECTED_SALES_INVOICE_COUNT,
      actual,
      status: actual === EXPECTED_SALES_INVOICE_COUNT ? "matched" : "mismatch",
    };
    await recordSalesCountDiagnostic({
      company: config.companyName,
      from: "2024-04-01",
      to,
      actualCount: actual,
      requestEvidence: {
        reports,
        endpoint: `http://${config.host}:${config.port}`,
      },
    });
  }

  const anyParsed = Object.values(parsed_counts).some((count) => count > 0);
  const status: CanonicalTallySyncResult["status"] =
    errors.length === 0 ? "success" : anyParsed ? "partial_success" : "failed";
  const result = {
    status,
    parsed_counts,
    inserted_counts,
    updated_counts,
    replaced_counts,
    errors,
    ai_suggestions,
  };
  await finishRun(runId, result);

  return {
    ok: status !== "failed",
    sync_run_id: runId,
    company: config.companyName,
    from,
    to,
    requested_reports: reports,
    invoice_check,
    ...result,
  };
}
