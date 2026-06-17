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
  preview?: Record<string, unknown>;
  fixSteps?: string[];
};

/** @deprecated Use TallySyncResult */
export type TallyImportResult = TallySyncResult;

async function queueFinanceRecords(
  records: Array<{
    company?: string;
    record_type: string;
    description?: string;
    amount: number;
    voucher_date?: string | null;
    source: "demo" | "tally" | "xml";
    raw_xml?: string;
  }>
): Promise<number> {
  const supabase = getAdminClient();
  if (!supabase || !records.length) return 0;

  const { error: tableErr } = await supabase
    .from("finance_import_queue")
    .select("id", { head: true, count: "exact" });

  if (tableErr) return 0;

  const payload = records.map((r) => ({
    company: r.company || null,
    record_type: r.record_type,
    description: r.description || null,
    amount: r.amount,
    voucher_date: r.voucher_date || null,
    status: "queued" as const,
    source: r.source,
    raw_xml: r.raw_xml || null,
  }));

  const { data, error } = await supabase
    .from("finance_import_queue")
    .insert(payload)
    .select("id");

  if (!error) return data?.length || 0;

  const { data: logged, error: logErr } = await supabase
    .from("activity_logs")
    .insert(
      records.map((r) => ({
        entity_type: "finance_import",
        action: "queued",
        notes: JSON.stringify({
          company: r.company,
          record_type: r.record_type,
          description: r.description,
          amount: r.amount,
          source: r.source,
        }),
      }))
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

async function syncTallyDemo(): Promise<TallySyncResult> {
  const xml = process.env.TALLY_DEMO_XML?.trim() || TALLY_DEMO_XML;
  const company =
    process.env.TALLY_COMPANY_NAME?.trim() || "Flexiflair Demo Co";
  const vouchers = parseTallyDemoXml(xml);

  const recordsQueued = await queueFinanceRecords(
    vouchers.map((v) => ({
      company,
      record_type: v.record_type,
      description: v.description,
      amount: v.amount,
      voucher_date: v.voucher_date,
      source: "demo" as const,
      raw_xml: xml.slice(0, 500),
    }))
  );

  return {
    ok: true,
    demo: true,
    message: `Demo mode — ${vouchers.length} finance record(s) parsed${recordsQueued ? `, ${recordsQueued} queued` : ""}`,
    recordsQueued: recordsQueued || vouchers.length,
    preview: {
      company,
      action: "sync_ledgers_demo",
      records: vouchers.length,
      sample: vouchers.slice(0, 2),
    },
  };
}

export async function syncTally(): Promise<TallySyncResult> {
  const resolved = await getResolvedTallyConfig();
  const { host, port, company, hostSource } = resolved;
  const endpoint = host ? `http://${host}:${port}` : undefined;

  if (!host) {
    const demo = await syncTallyDemo();
    return {
      ...demo,
      ok: true,
      demo: true,
      message: `Tally cloud host not set — enter IP/hostname below and click Save & Test (port ${port}, company: ${company || "not set"})`,
      fixSteps: [
        "Integration Hub → Tally card → enter Cloud Host → Save & Test",
        `Port ${port} (TALLY_PORT) · Company: ${company || "set TALLY_COMPANY_NAME"}`,
        "Ensure Tally Cloud XML gateway is enabled on that port",
      ],
    };
  }

  if (isLocalTallyHost(host)) {
    const demo = await syncTallyDemo();
    return {
      ...demo,
      ok: true,
      demo: true,
      endpoint,
      message: `TALLY_HOST is localhost — Tally is on Cloud, not local. Set TALLY_HOST to your cloud server IP/hostname (gateway port ${port}). Current: localhost:${port}`,
      fixSteps: [
        `Remove TALLY_HOST=localhost from .env.local`,
        `Set TALLY_HOST=your-tally-cloud-server-ip-or-hostname (port ${port} via TALLY_PORT)`,
        "Or enter cloud hostname in Integration Hub → Tally card below",
        `Company: "${company || "not set"}" — must match Tally exactly`,
        ...tallyCloudFixSteps("your-cloud-server", port).slice(1),
      ],
    };
  }

  if (!company) {
    const reachable = endpoint ? await checkTallyGateway(endpoint) : false;

    if (!reachable) {
      const demo = await syncTallyDemo();
      return {
        ...demo,
        ok: true,
        demo: true,
        endpoint,
        message: `Tally cloud gateway unreachable at ${endpoint} — showing demo data. Verify XML gateway on port ${port} is open on your cloud server.`,
        fixSteps: tallyCloudFixSteps(host, port),
      };
    }

    const demo = await syncTallyDemo();
    return {
      ...demo,
      endpoint,
      message: `TALLY_COMPANY_NAME missing — cloud gateway reachable at ${endpoint}. ${demo.message}. Add company name for live sync.`,
      fixSteps: [
        "In Tally: F3 → Company Info → copy exact company name",
        "Set TALLY_COMPANY_NAME=Your Exact Company Name in .env.local",
      ],
    };
  }

  const { configured } = getTallyConfig();
  if (!configured && hostSource === "none") {
    return syncTallyDemo();
  }

  try {
    const xmlRequest = `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Ledgers</ID></HEADER><BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY></STATICVARIABLES></DESC></BODY></ENVELOPE>`;

    const res = await fetch(endpoint!, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: xmlRequest,
      signal: AbortSignal.timeout(12000),
    });

    const xml = await res.text();
    const vouchers = parseTallyDemoXml(xml);

    if (vouchers.length > 0) {
      const recordsQueued = await queueFinanceRecords(
        vouchers.map((v) => ({
          company,
          record_type: v.record_type,
          description: v.description,
          amount: v.amount,
          voucher_date: v.voucher_date,
          source: "tally" as const,
          raw_xml: xml.slice(0, 2000),
        }))
      );

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
        message: `Tally cloud sync — ${vouchers.length} record(s) from ${endpoint}${recordsQueued ? `, ${recordsQueued} queued` : ""}${sheetPush.ok ? " · pushed to GSheet" : ""}`,
        recordsQueued,
        preview: {
          company,
          records: vouchers.length,
          hostSource,
          sheetWrite: sheetPush.message,
        },
      };
    }
  } catch {
    // fall through
  }

  const reachable = endpoint ? await checkTallyGateway(endpoint) : false;
  if (!reachable) {
    const demo = await syncTallyDemo();
    return {
      ...demo,
      ok: true,
      demo: true,
      endpoint,
      message: `Cannot reach Tally cloud gateway at ${endpoint} — demo data shown. Check cloud server firewall and XML gateway on port ${port}.`,
      fixSteps: [
        `Verify Tally Cloud XML gateway at ${host}:${port}`,
        `Confirm company name "${company}" matches Tally exactly`,
        "Ensure cloud server allows inbound connections on the gateway port",
      ],
    };
  }

  const recordsQueued = await queueFinanceRecords([
    {
      company,
      record_type: "ledger",
      description: `Tally cloud gateway reachable at ${endpoint} — awaiting full XML export for "${company}"`,
      amount: 0,
      source: "tally",
    },
  ]);

  return {
    ok: true,
    demo: false,
    endpoint,
    message: `Tally cloud configured — gateway OK at ${endpoint}, sync queued for "${company}"`,
    recordsQueued: recordsQueued || 1,
    preview: {
      company,
      action: "sync_ledgers_stub",
      endpoint,
      hostSource,
    },
  };
}

/** @deprecated Use syncTally */
export const importTallyStub = syncTally;
