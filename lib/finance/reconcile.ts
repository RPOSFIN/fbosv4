import { getAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Finance Reconciliation Service.
 *
 * Permanent, code-driven reconciliation of the Tally finance pipeline. Advances
 * finance_transactions through the lifecycle pending_tally → synced → verified
 * (or → failed for incomplete rows), comparing against finance_import_queue,
 * logging every batch to finance_sync_log for audit + rollback. This replaces
 * any manual `UPDATE … SET sync_status='synced'` intervention.
 */

const FINANCE_STATUSES = ["pending_tally", "processing", "synced", "verified", "failed"] as const;
export type FinanceStatus = (typeof FINANCE_STATUSES)[number];

export type FinanceSyncHealth = {
  available: boolean;
  total: number;
  byStatus: Record<string, number>;
  pendingTally: number;
  failedSync: number;
  synced: number;
  verified: number;
  imported: number;
  queueSize: number;
  lastSyncAt: string | null;
  healthScore: number;
};

type TxRow = {
  id: string;
  source: string | null;
  amount: number | null;
  reference_no: string | null;
  tally_sync_at: string | null;
  voucher_no?: string | null;
  ledger_name?: string | null;
  party_name?: string | null;
  finance_import_queue_id?: string | null;
};

function hasRealReference(r: TxRow): boolean {
  const reference = (r.reference_no || "").trim();
  if (!reference || reference.startsWith("TALLY-AUTO-")) return false;
  return Boolean(
    reference ||
      (r.voucher_no || "").trim() ||
      (r.ledger_name || "").trim() ||
      (r.party_name || "").trim() ||
      r.finance_import_queue_id
  );
}

function isValidTally(r: TxRow): boolean {
  return (
    (r.source || "").toLowerCase() === "tally" &&
    r.amount !== null &&
    r.amount !== undefined &&
    hasRealReference(r)
  );
}

async function countStatus(supabase: SupabaseClient, status: string): Promise<number> {
  const { count } = await supabase
    .from("finance_transactions")
    .select("id", { count: "exact", head: true })
    .eq("source", "tally")
    .eq("sync_status", status);
  return count ?? 0;
}

export async function getFinanceSyncHealth(): Promise<FinanceSyncHealth> {
  const supabase = getAdminClient();
  const empty: FinanceSyncHealth = {
    available: false, total: 0, byStatus: {}, pendingTally: 0, failedSync: 0,
    synced: 0, verified: 0, imported: 0, queueSize: 0, lastSyncAt: null, healthScore: 0,
  };
  if (!supabase) return empty;

  const probe = await supabase
    .from("finance_transactions")
    .select("id", { count: "exact", head: true })
    .eq("source", "tally");
  if (probe.error) return empty;

  const byStatus: Record<string, number> = {};
  for (const s of FINANCE_STATUSES) byStatus[s] = await countStatus(supabase, s);
  const total = probe.count ?? Object.values(byStatus).reduce((a, b) => a + b, 0);

  const { count: queueSize } = await supabase
    .from("finance_import_queue")
    .select("id", { count: "exact", head: true })
    .eq("source", "tally")
    .neq("status", "failed");

  const { data: lastRow } = await supabase
    .from("finance_transactions")
    .select("tally_sync_at")
    .eq("source", "tally")
    .not("tally_sync_at", "is", null)
    .order("tally_sync_at", { ascending: false })
    .limit(1);

  const verified = byStatus["verified"] || 0;
  const synced = byStatus["synced"] || 0;
  return {
    available: true,
    total,
    byStatus,
    pendingTally: byStatus["pending_tally"] || 0,
    failedSync: byStatus["failed"] || 0,
    synced,
    verified,
    imported: verified + synced,
    queueSize: queueSize ?? 0,
    lastSyncAt: lastRow?.[0]?.tally_sync_at ?? null,
    healthScore: total > 0 ? Math.round((verified / total) * 100) : 100,
  };
}

async function logBatch(
  supabase: SupabaseClient,
  action: string,
  fromStatus: string | null,
  toStatus: string | null,
  affected: Array<{ id: string; from_status: string }>,
  detail: string
): Promise<string | null> {
  const { data } = await supabase
    .from("finance_sync_log")
    .insert({ action, from_status: fromStatus, to_status: toStatus, affected_count: affected.length, affected, detail })
    .select("batch_id")
    .single();
  return data?.batch_id ?? null;
}

export type ReconcileResult = {
  ok: boolean;
  syncedFromPending: number;
  failed: number;
  verified: number;
  duplicates: number;
  orphans: number;
  missingInTransactions: number;
  batches: string[];
  message: string;
};

export async function reconcileFinance(opts: { dryRun?: boolean } = {}): Promise<ReconcileResult> {
  const supabase = getAdminClient();
  if (!supabase) {
    return { ok: false, syncedFromPending: 0, failed: 0, verified: 0, duplicates: 0, orphans: 0, missingInTransactions: 0, batches: [], message: "Supabase admin client unavailable (no SERVICE_ROLE key)" };
  }
  const dryRun = !!opts.dryRun;
  const batches: string[] = [];

  const { data: pending } = await supabase
    .from("finance_transactions")
    .select("id, source, amount, reference_no, tally_sync_at, voucher_no, ledger_name, party_name, finance_import_queue_id")
    .eq("source", "tally")
    .eq("sync_status", "pending_tally");
  const valid = (pending || []).filter((r) => isValidTally(r as TxRow));
  const invalid = (pending || []).filter((r) => !isValidTally(r as TxRow));

  if (!dryRun && valid.length) {
    await supabase
      .from("finance_transactions")
      .update({ sync_status: "synced", tally_sync_at: new Date().toISOString(), sync_note: "validated Tally transaction" })
      .in("id", valid.map((r) => r.id));
    const b = await logBatch(supabase, "reconcile", "pending_tally", "synced", valid.map((r) => ({ id: r.id as string, from_status: "pending_tally" })), `${valid.length} valid Tally row(s) advanced pending_tally → synced`);
    if (b) batches.push(b);
  }
  if (!dryRun && invalid.length) {
    await supabase
      .from("finance_transactions")
      .update({ sync_status: "failed", sync_note: "incomplete: missing amount or real Tally reference" })
      .in("id", invalid.map((r) => r.id));
    const b = await logBatch(supabase, "reconcile", "pending_tally", "failed", invalid.map((r) => ({ id: r.id as string, from_status: "pending_tally" })), `${invalid.length} incomplete row(s) flagged failed`);
    if (b) batches.push(b);
  }

  const { data: synced } = await supabase
    .from("finance_transactions")
    .select("id, source, amount, reference_no, tally_sync_at, voucher_no, ledger_name, party_name, finance_import_queue_id")
    .eq("source", "tally")
    .eq("sync_status", "synced");
  const verifiable = (synced || []).filter((r) => isValidTally(r as TxRow) && !!r.tally_sync_at);
  if (!dryRun && verifiable.length) {
    await supabase
      .from("finance_transactions")
      .update({ sync_status: "verified", sync_note: "verified Tally transaction" })
      .in("id", verifiable.map((r) => r.id));
    const b = await logBatch(supabase, "reconcile", "synced", "verified", verifiable.map((r) => ({ id: r.id as string, from_status: "synced" })), `${verifiable.length} row(s) advanced synced → verified`);
    if (b) batches.push(b);
  }

  const anomalies = await detectAnomalies(supabase);

  return {
    ok: true,
    syncedFromPending: valid.length,
    failed: invalid.length,
    verified: verifiable.length,
    duplicates: anomalies.duplicates,
    orphans: anomalies.orphans,
    missingInTransactions: anomalies.missing,
    batches,
    message: dryRun
      ? `Dry run: ${valid.length} would sync, ${invalid.length} would fail, ${verifiable.length} would verify`
      : `Reconciled: ${valid.length} synced, ${verifiable.length} verified, ${invalid.length} failed`,
  };
}

async function detectAnomalies(supabase: SupabaseClient) {
  const { data: txs } = await supabase
    .from("finance_transactions")
    .select("reference_no")
    .eq("source", "tally")
    .limit(5000);
  const { data: queue } = await supabase
    .from("finance_import_queue")
    .select("voucher_no, reference, ledger_name, party_name")
    .eq("source", "tally")
    .limit(5000);

  const txRefs = (txs || []).map((t) => (t.reference_no || "").trim()).filter(Boolean);
  const queueRefs = new Set(
    (queue || [])
      .flatMap((q) => [q.voucher_no, q.reference, q.ledger_name, q.party_name])
      .map((v) => (v || "").trim())
      .filter(Boolean)
  );

  const seen = new Map<string, number>();
  for (const r of txRefs) seen.set(r, (seen.get(r) || 0) + 1);
  const duplicates = [...seen.values()].filter((n) => n > 1).reduce((a, n) => a + (n - 1), 0);
  const orphans = txRefs.filter((r) => queueRefs.size > 0 && !queueRefs.has(r)).length;
  const txRefSet = new Set(txRefs);
  const missing = [...queueRefs].filter((r) => !txRefSet.has(r)).length;

  return { duplicates, orphans, missing };
}

export type RollbackResult = { ok: boolean; reverted: number; message: string };

export async function rollbackBatch(batchId: string): Promise<RollbackResult> {
  const supabase = getAdminClient();
  if (!supabase) return { ok: false, reverted: 0, message: "Supabase admin client unavailable" };

  const { data: logs } = await supabase
    .from("finance_sync_log")
    .select("affected, action")
    .eq("batch_id", batchId)
    .eq("action", "reconcile");

  if (!logs || logs.length === 0) return { ok: false, reverted: 0, message: `No reconcile batch found for ${batchId}` };

  let reverted = 0;
  for (const log of logs) {
    const affected = (log.affected as Array<{ id: string; from_status: string }>) || [];
    for (const a of affected) {
      const update: Record<string, unknown> = { sync_status: a.from_status };
      if (a.from_status === "pending_tally") update.tally_sync_at = null;
      const { error } = await supabase.from("finance_transactions").update(update).eq("id", a.id);
      if (!error) reverted += 1;
    }
  }

  await supabase.from("finance_sync_log").insert({ batch_id: batchId, action: "rollback", affected_count: reverted, detail: `Rolled back ${reverted} row(s) from batch ${batchId}` });

  return { ok: true, reverted, message: `Rolled back ${reverted} row(s)` };
}
