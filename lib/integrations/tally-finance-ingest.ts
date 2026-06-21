export type TallyFinanceRecord = Record<string, unknown>;

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapRecordType(dataType: string | null): string {
  if (!dataType) return "ledger";
  const d = dataType.toLowerCase();
  if (d === "bank_cash") return "bank_cash";
  if (d === "receivable") return "receivable";
  if (d === "payable") return "payable";
  if (d === "voucher") return "voucher";
  return d;
}

export function mapTallyRecordsToFinanceQueue(records: TallyFinanceRecord[]) {
  return records.map((rec) => ({
    company: str(rec.company_name) || str(rec.company),
    record_type: mapRecordType(str(rec.data_type)),
    description:
      str(rec.description) ||
      str(rec.narration) ||
      `${str(rec.ledger_name) || "Tally"} sync`,
    amount: num(rec.amount) ?? num(rec.closing_balance) ?? num(rec.outstanding_amount) ?? 0,
    voucher_date: str(rec.voucher_date) || str(rec.as_on_date) || str(rec.bill_date),
    voucher_no: str(rec.voucher_no) || str(rec.bill_no),
    voucher_type: str(rec.voucher_type),
    ledger_name: str(rec.ledger_name) || str(rec.bank_name),
    party_name: str(rec.party_name) || str(rec.ledger_name),
    debit: num(rec.debit),
    credit: num(rec.credit),
    narration: str(rec.narration),
    gst_no: str(rec.gst_no),
    reference: str(rec.reference),
    status: "queued" as const,
    source: "tally" as const,
  }));
}

export async function ingestTallyFinanceRecords(
  records: TallyFinanceRecord[]
): Promise<{ inserted: number; sheetWrite?: { ok: boolean; message: string } }> {
  const { getAdminClient } = await import("@/lib/supabase/admin");
  const { pushTallyRecordsToSheet } = await import("@/lib/google-write");

  const rows = mapTallyRecordsToFinanceQueue(records);
  if (!rows.length) return { inserted: 0 };

  let inserted = 0;
  const supabase = getAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("finance_import_queue")
      .insert(rows)
      .select("id");
    if (error) throw new Error(error.message);
    inserted = data?.length || 0;

    await supabase.from("integrations").upsert(
      {
        connector_name: "tally",
        status: "connected",
        last_sync_at: new Date().toISOString(),
        error_message: null,
        config: { lastIngest: inserted, source: "webhook" },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "connector_name" }
    );
  }

  const sheetWrite = await pushTallyRecordsToSheet(
    rows.map((r) => ({
      company: r.company || undefined,
      description: r.description || undefined,
      amount: r.amount ?? undefined,
      voucher_date: r.voucher_date,
      record_type: r.record_type,
    }))
  );

  return {
    inserted,
    sheetWrite: { ok: sheetWrite.ok, message: sheetWrite.message },
  };
}
