import { pushTallyRecordsToSheet } from "@/lib/google-write";
import { getTallyConfig } from "@/lib/integrations/config";
import { parseTallyDemoXml, TALLY_DEMO_XML } from "@/lib/integrations/demo-data";
import {
  getResolvedTallyConfig,
  isLocalTallyHost,
  tallyCloudFixSteps,
} from "@/lib/integrations/tally-config";
import { getAdminClient } from "@/lib/supabase/admin";

export type TallySyncResult = {
  ok: boolean;
  demo: boolean;
  endpoint?: string;
  message: string;
  recordsQueued?: number;
  recordsImported?: number;
  preview?: Record<string, unknown>;
  fixSteps?: string[];
};

/** @deprecated Use TallySyncResult */
export type TallyImportResult = TallySyncResult;

type FinanceRecord = {
  company?: string;
  record_type: string;
  description?: string;
  amount: number;
  voucher_date?: string | null;
  source: "demo" | "tally" | "xml";
  raw_xml?: string;
  voucher_no?: string | null;
  reference?: string | null;
  ledger_name?: string | null;
};

type PersistResult = { queued: number; imported: number; errors: string[] };

function clean(value: string | undefined | null) {
  return (value || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}

function tag(block: string, name: string) {
  return clean(block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1]);
}

function attr(block: string, name: string) {
  return clean(block.match(new RegExp(`${name}="([^"]+)"`, "i"))?.[1]);
}

function parseTallyDate(raw: string) {
  const value = clean(raw).replace(/-/g, "");
  if (/^\d{8}$/.test(value)) return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  return null;
}

function parseAmount(raw: string) {
  const normalized = clean(raw).replace(/,/g, "");
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function parseTallyVoucherXml(xml: string) {
  const vouchers: Array<Omit<FinanceRecord, "company" | "source" | "raw_xml">> = [];
  const blocks = xml.match(/<VOUCHER[\s\S]*?<\/VOUCHER>/gi) || [];

  for (const block of blocks) {
    const voucherType = attr(block, "VCHTYPE") || tag(block, "VOUCHERTYPENAME") || "voucher";
    const voucherNo = tag(block, "VOUCHERNUMBER") || tag(block, "REFERENCE") || tag(block, "GUID") || null;
    const narration = tag(block, "NARRATION");
    const voucherDate = parseTallyDate(tag(block, "DATE"));
    const entries = block.match(/<ALLLEDGERENTRIES\.LIST[\s\S]*?<\/ALLLEDGERENTRIES\.LIST>/gi) || [];

    if (entries.length === 0) {
      vouchers.push({
        record_type: voucherType.toLowerCase(),
        description: narration || voucherType,
        amount: parseAmount(tag(block, "AMOUNT")),
        voucher_date: voucherDate,
        voucher_no: voucherNo,
        reference: voucherNo,
        ledger_name: tag(block, "PARTYLEDGERNAME") || null,
      });
      continue;
    }

    for (const entry of entries) {
      const ledger = tag(entry, "LEDGERNAME") || tag(block, "PARTYLEDGERNAME") || voucherType;
      const amount = parseAmount(tag(entry, "AMOUNT"));
      vouchers.push({
        record_type: voucherType.toLowerCase(),
        description: narration || `${voucherType} · ${ledger}`,
        amount,
        voucher_date: voucherDate,
        voucher_no: voucherNo,
        reference: voucherNo || `${voucherType}-${voucherDate || "no-date"}-${ledger}-${amount}`,
        ledger_name: ledger,
      });
    }
  }

  return vouchers;
}

function buildVoucherExportXml(company: string) {
  return `<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>FinanceOSVouchers</ID></HEADER>
<BODY><DESC>
<STATICVARIABLES><SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>
<TDL><TDLMESSAGE>
<COLLECTION NAME="FinanceOSVouchers" ISMODIFY="No"><TYPE>Voucher</TYPE><FETCH>DATE,VOUCHERTYPENAME,VOUCHERNUMBER,REFERENCE,PARTYLEDGERNAME,NARRATION,ALLLEDGERENTRIES.LIST,LEDGERNAME,AMOUNT</FETCH></COLLECTION>
</TDLMESSAGE></TDL>
</DESC></BODY>
</ENVELOPE>`;
}

async function persistFinanceRecords(records: FinanceRecord[]): Promise<PersistResult> {
  const supabase = getAdminClient();
  if (!supabase) return { queued: 0, imported: 0, errors: ["Supabase admin client unavailable"] };
  if (!records.length) return { queued: 0, imported: 0, errors: [] };

  const errors: string[] = [];
  const queuePayload = records.map((r) => ({
    company: r.company || null,
    record_type: r.record_type,
    description: r.description || null,
    amount: r.amount,
    voucher_date: r.voucher_date || null,
    status: "queued",
    source: r.source,
    raw_xml: r.raw_xml || null,
    voucher_no: r.voucher_no || null,
    reference: r.reference || r.voucher_no || null,
    ledger_name: r.ledger_name || null,
  }));

  const { data: queued, error: queueError } = await supabase
    .from("finance_import_queue")
    .insert(queuePayload)
    .select("id, reference, voucher_no");

  if (queueError) errors.push(`finance_import_queue: ${queueError.message}`);

  const txPayload = records.map((r, index) => ({
    source: r.source,
    company: r.company || null,
    transaction_type: r.record_type,
    voucher_type: r.record_type,
    voucher_no: r.voucher_no || null,
    voucher_date: r.voucher_date || null,
    ledger_name: r.ledger_name || r.description || null,
    amount: r.amount,
    reference_no: r.reference || r.voucher_no || queued?.[index]?.reference || queued?.[index]?.voucher_no || null,
    queue_id: queued?.[index]?.id || null,
    sync_status: r.source === "tally" ? "pending_tally" : "synced",
    sync_note: r.description || null,
    tally_sync_at: r.source === "tally" ? new Date().toISOString() : null,
  }));

  const { data: imported, error: txError } = await supabase
    .from("finance_transactions")
    .insert(txPayload)
    .select("id");

  if (txError) errors.push(`finance_transactions: ${txError.message}`);

  return { queued: queued?.length || 0, imported: imported?.length || 0, errors };
}

async function checkTallyGateway(endpoint: string): Promise<boolean> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: "<ENVELOPE></ENVELOPE>",
      signal: AbortSignal.timeout(8000),
    });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function syncTallyDemo(): Promise<TallySyncResult> {
  const xml = process.env.TALLY_DEMO_XML?.trim() || TALLY_DEMO_XML;
  const company = process.env.TALLY_COMPANY_NAME?.trim() || "Flexiflair Demo Co";
  const vouchers = parseTallyDemoXml(xml);
  const persisted = await persistFinanceRecords(
    vouchers.map((v) => ({
      company,
      record_type: v.record_type,
      description: v.description,
      amount: v.amount,
      voucher_date: v.voucher_date,
      source: "demo" as const,
      raw_xml: xml.slice(0, 500),
      reference: `${v.record_type}-${v.voucher_date || "demo"}-${v.amount}`,
      ledger_name: v.description,
    }))
  );

  return {
    ok: persisted.errors.length === 0,
    demo: true,
    message: `Demo mode — ${vouchers.length} finance record(s) parsed, ${persisted.queued} queued, ${persisted.imported} imported${persisted.errors.length ? ` (${persisted.errors.join("; ")})` : ""}`,
    recordsQueued: persisted.queued,
    recordsImported: persisted.imported,
    preview: { company, action: "sync_ledgers_demo", records: vouchers.length, sample: vouchers.slice(0, 2) },
  };
}

export async function syncTally(): Promise<TallySyncResult> {
  const resolved = await getResolvedTallyConfig();
  const { host, port, company, hostSource } = resolved;
  const endpoint = host ? `http://${host}:${port}` : undefined;

  if (!host) {
    const demo = await syncTallyDemo();
    return { ...demo, ok: false, demo: true, message: `Tally cloud host not set — records were demo only. Set TALLY_HOST and TALLY_COMPANY_NAME for live sync.` };
  }

  if (isLocalTallyHost(host)) {
    const demo = await syncTallyDemo();
    return {
      ...demo,
      ok: false,
      demo: true,
      endpoint,
      message: `TALLY_HOST is localhost — Tally is on Cloud, not local. Set TALLY_HOST to your cloud server IP/hostname (gateway port ${port}).`,
      fixSteps: [`Set TALLY_HOST=your-tally-cloud-server-ip-or-hostname`, `Set TALLY_PORT=${port}`, `Set TALLY_COMPANY_NAME exactly as shown in Tally`],
    };
  }

  if (!company) {
    const reachable = endpoint ? await checkTallyGateway(endpoint) : false;
    const demo = await syncTallyDemo();
    return {
      ...demo,
      ok: false,
      endpoint,
      message: reachable ? `Tally gateway reachable at ${endpoint}, but TALLY_COMPANY_NAME is missing. Demo rows imported only.` : `Tally gateway unreachable at ${endpoint}. Demo rows imported only.`,
      fixSteps: reachable ? ["Set exact TALLY_COMPANY_NAME from Tally F3 Company Info"] : tallyCloudFixSteps(host, port),
    };
  }

  const { configured } = getTallyConfig();
  if (!configured && hostSource === "none") return syncTallyDemo();

  try {
    const res = await fetch(endpoint!, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: buildVoucherExportXml(company),
      signal: AbortSignal.timeout(20000),
    });
    const xml = await res.text();
    const vouchers = parseTallyVoucherXml(xml);

    if (vouchers.length === 0) {
      return {
        ok: false,
        demo: false,
        endpoint,
        message: `Tally gateway responded but returned 0 voucher rows. Check company name and Tally XML collection permissions. No dummy ledger row was inserted.`,
        recordsQueued: 0,
        recordsImported: 0,
        preview: { company, hostSource, xmlPreview: xml.slice(0, 300) },
      };
    }

    const records = vouchers.map((v) => ({ ...v, company, source: "tally" as const, raw_xml: xml.slice(0, 2000) }));
    const persisted = await persistFinanceRecords(records);
    const sheetPush = await pushTallyRecordsToSheet(records.map((v) => ({ company, description: v.description, amount: v.amount, voucher_date: v.voucher_date, record_type: v.record_type })));

    return {
      ok: persisted.errors.length === 0,
      demo: false,
      endpoint,
      message: `Tally cloud sync — ${vouchers.length} voucher ledger row(s), ${persisted.queued} queued, ${persisted.imported} imported${sheetPush.ok ? " · pushed to GSheet" : ""}${persisted.errors.length ? ` (${persisted.errors.join("; ")})` : ""}`,
      recordsQueued: persisted.queued,
      recordsImported: persisted.imported,
      preview: { company, records: vouchers.length, hostSource, sheetWrite: sheetPush.message, sample: records.slice(0, 3) },
    };
  } catch (error) {
    const reachable = endpoint ? await checkTallyGateway(endpoint) : false;
    return {
      ok: false,
      demo: false,
      endpoint,
      message: reachable ? `Tally gateway reachable but voucher export failed: ${String(error)}` : `Cannot reach Tally cloud gateway at ${endpoint}.`,
      recordsQueued: 0,
      recordsImported: 0,
      fixSteps: tallyCloudFixSteps(host, port),
    };
  }
}

/** @deprecated Use syncTally */
export const importTallyStub = syncTally;
