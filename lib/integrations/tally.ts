import { pushTallyRecordsToSheet } from "@/lib/google-write";
import { getTallyConfig } from "@/lib/integrations/config";
import {
  parseTallyXml,
  type TallyFinanceRecord,
} from "@/lib/integrations/demo-data";
import {
  getResolvedTallyConfig,
  isLocalTallyHost,
  allowLocalTally,
  tallyCloudFixSteps,
} from "@/lib/integrations/tally-config";
import { getAdminClient } from "@/lib/supabase/admin";

export type TallySyncResult = {
  ok: boolean;
  demo: boolean;
  endpoint?: string;
  message: string;
  recordsQueued?: number;
  parsedCount?: number;
  preview?: Record<string, unknown>;
  fixSteps?: string[];
};

/** @deprecated Use TallySyncResult */
export type TallyImportResult = TallySyncResult;

function normalizeFinanceRecord(record: TallyFinanceRecord): TallyFinanceRecord {
  const amount = Number.isFinite(record.amount) ? record.amount : 0;
  const debit = record.debit ?? (amount < 0 ? Math.abs(amount) : 0);
  const credit = record.credit ?? (amount > 0 ? amount : 0);
  const voucherType = record.voucher_type || record.record_type || "ledger";
  const description =
    record.description ||
    record.narration ||
    record.reference ||
    record.voucher_no ||
    record.party_name ||
    record.ledger_name ||
    voucherType;

  return {
    ...record,
    record_type: (record.record_type || voucherType || "ledger").toLowerCase(),
    description,
    amount,
    debit,
    credit,
    voucher_type: voucherType,
  };
}

async function queueFinanceRecords(records: TallyFinanceRecord[]): Promise<number> {
  const supabase = getAdminClient();
  if (!supabase || !records.length) return 0;

  const { error: tableErr } = await supabase
    .from("finance_import_queue")
    .select("id", { head: true, count: "exact" });

  if (tableErr) return 0;

  const payload = records.map((record) => {
    const r = normalizeFinanceRecord(record);
    return {
      company: r.company || null,
      record_type: r.record_type,
      description: r.description || null,
      amount: r.amount,
      voucher_date: r.voucher_date || null,
      status: "queued" as const,
      source: r.source || "tally",
      raw_xml: r.raw_xml || null,
      voucher_no: r.voucher_no || null,
      voucher_type: r.voucher_type || null,
      ledger_name: r.ledger_name || null,
      party_name: r.party_name || null,
      debit: r.debit || 0,
      credit: r.credit || 0,
      reference: r.reference || null,
      narration: r.narration || null,
      gst_no: r.gst_no || null,
    };
  });

  const { data, error } = await supabase
    .from("finance_import_queue")
    .insert(payload)
    .select("id");

  if (!error) return data?.length || 0;

  const { data: logged, error: logErr } = await supabase
    .from("activity_logs")
    .insert(
      records.map((record) => {
        const r = normalizeFinanceRecord(record);
        return {
          entity_type: "finance_import",
          action: "queued",
          notes: JSON.stringify({
            company: r.company,
            record_type: r.record_type,
            description: r.description,
            amount: r.amount,
            voucher_no: r.voucher_no,
            voucher_type: r.voucher_type,
            ledger_name: r.ledger_name,
            party_name: r.party_name,
            debit: r.debit,
            credit: r.credit,
            source: r.source,
          }),
        };
      })
    )
    .select("id");

  if (logErr) {
    console.warn("[tally] queue records:", logErr.message);
    return 0;
  }

  return logged?.length || 0;
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

function tallyDate(value: Date): string {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function getTallyFromDate(): string {
  return process.env.TALLY_FROM_DATE?.trim() || "20240401";
}

function getTallyToDate(): string {
  return process.env.TALLY_TO_DATE?.trim() || tallyDate(new Date());
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSalesVoucherRequest(company: string, fromDate: string, toDate: string): string {
  const currentCompany = escapeXml(company);
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>FBOSSalesVouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${currentCompany}</SVCURRENTCOMPANY>
        <SVFROMDATE TYPE="Date">${fromDate}</SVFROMDATE>
        <SVTODATE TYPE="Date">${toDate}</SVTODATE>
        <EXPLODEFLAG>Yes</EXPLODEFLAG>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="FBOSSalesVouchers" ISMODIFY="No">
            <TYPE>Voucher</TYPE>
            <FETCH>DATE,VOUCHERTYPENAME,VOUCHERNUMBER,REFERENCE,PARTYLEDGERNAME,PARTYGSTIN,NARRATION,ALLLEDGERENTRIES.LIST,LEDGERNAME,AMOUNT</FETCH>
            <FILTERS>FBOSOnlySales</FILTERS>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="FBOSOnlySales">$VOUCHERTYPENAME = "Sales"</SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
}

function noDemoResult(message: string, endpoint?: string, fixSteps?: string[]): TallySyncResult {
  return {
    ok: false,
    demo: false,
    endpoint,
    message,
    parsedCount: 0,
    recordsQueued: 0,
    fixSteps,
  };
}

export async function syncTally(): Promise<TallySyncResult> {
  const resolved = await getResolvedTallyConfig();
  const { host, port, company, hostSource } = resolved;
  const endpoint = host ? `http://${host}:${port}` : undefined;

  if (!host) {
    return noDemoResult(
      `Tally host not set — live sync cannot run (port ${port}, company: ${company || "not set"})`,
      endpoint,
      [
        "Integration Hub → Tally card → enter host → Save & Test",
        `Port ${port} (TALLY_PORT) · Company: ${company || "set TALLY_COMPANY_NAME"}`,
        "Ensure Tally XML gateway is enabled on that port",
      ]
    );
  }

  if (isLocalTallyHost(host) && !allowLocalTally()) {
    return noDemoResult(
      `TALLY_HOST is localhost — set TALLY_ALLOW_LOCAL=true only when Tally runs on this machine (port ${port}).`,
      endpoint,
      [
        `On the Tally machine: TALLY_HOST=127.0.0.1 and TALLY_ALLOW_LOCAL=true`,
        `Remote dev PC: use server hostname/IP, not localhost`,
        `Company: "${company || "not set"}" — must match Tally exactly`,
        ...tallyCloudFixSteps("your-server", port).slice(1),
      ]
    );
  }

  if (!company) {
    const reachable = endpoint ? await checkTallyGateway(endpoint) : false;
    return noDemoResult(
      reachable
        ? `TALLY_COMPANY_NAME missing — gateway reachable at ${endpoint}, but company is required for live sales invoice sync.`
        : `Tally gateway unreachable at ${endpoint} and company is missing.`,
      endpoint,
      [
        "In Tally: F3 → Company Info → copy exact company name",
        "Set TALLY_COMPANY_NAME=Your Exact Company Name in .env.local",
      ]
    );
  }

  const { configured } = getTallyConfig();
  if (!configured && hostSource === "none") {
    return noDemoResult("Tally config is incomplete — live sync cannot run.", endpoint);
  }

  try {
    const fromDate = getTallyFromDate();
    const toDate = getTallyToDate();
    const xmlRequest = buildSalesVoucherRequest(company, fromDate, toDate);

    const res = await fetch(endpoint!, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: xmlRequest,
      signal: AbortSignal.timeout(Number(process.env.TALLY_TIMEOUT_MS || 60000)),
    });

    const xml = await res.text();
    if (!res.ok) {
      return noDemoResult(`Tally sales invoice request failed with HTTP ${res.status}`, endpoint);
    }

    const vouchers = parseTallyXml(xml, {
      company,
      source: "tally",
      rawXmlLimit: 4000,
    })
      .map((record) => normalizeFinanceRecord({ ...record, record_type: record.record_type || "sales" }))
      .filter((record) => (record.voucher_type || record.record_type || "").toLowerCase().includes("sales"));

    if (vouchers.length > 0) {
      const recordsQueued = await queueFinanceRecords(vouchers);

      const sheetPush = await pushTallyRecordsToSheet(
        vouchers.map((v) => ({
          company,
          description: v.description,
          amount: v.amount,
          voucher_date: v.voucher_date,
          record_type: v.record_type,
        }))
      );

      return {
        ok: true,
        demo: false,
        endpoint,
        message: `Tally live sales invoice sync — ${vouchers.length} invoice voucher(s) parsed from ${fromDate} to ${toDate}${recordsQueued ? `, ${recordsQueued} queued` : ""}${sheetPush.ok ? " · pushed to GSheet" : ""}`,
        parsedCount: vouchers.length,
        recordsQueued,
        preview: {
          company,
          records: vouchers.length,
          source: "tally",
          voucherType: "Sales",
          fromDate,
          toDate,
          hostSource,
          sheetWrite: sheetPush.message,
          sample: vouchers.slice(0, 2).map(({ raw_xml, ...record }) => record),
        },
      };
    }

    return noDemoResult(
      `Tally returned 0 Sales voucher(s) for ${company} from ${fromDate} to ${toDate}. No demo/stub rows were queued.`,
      endpoint,
      [
        "Confirm Sales vouchers exist in Tally for the same date range",
        "Confirm Tally XML gateway allows Voucher collection export",
        "Open /api/tally/test to verify gateway response diagnostics",
      ]
    );
  } catch (err) {
    return noDemoResult(
      err instanceof Error ? `Tally live sales invoice sync failed: ${err.message}` : "Tally live sales invoice sync failed",
      endpoint,
      tallyCloudFixSteps(host, port)
    );
  }
}

/** @deprecated Use syncTally */
export const importTallyStub = syncTally;
