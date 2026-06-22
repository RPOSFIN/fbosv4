import {
  getGSheetCsvUrlForGid,
  getGoogleSheetId,
  getSheetTabGids,
} from "@/lib/google-config";
import { syncGSheet, type GSheetSyncResult } from "@/lib/integrations/gsheet";
import { getAdminClient } from "@/lib/supabase/admin";

export type HubPullResult = GSheetSyncResult & {
  operationsImported?: number;
  financeImported?: number;
  clientsImported?: number;
  followupsImported?: number;
  tabsSynced?: string[];
};

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else inQuotes = false;
      } else current += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      cols.push(current.trim());
      current = "";
    } else current += ch;
  }
  cols.push(current.trim());
  return cols;
}

async function fetchRawRows(gid: string): Promise<Record<string, string>[]> {
  const url = getGSheetCsvUrlForGid(gid);
  if (!url) return [];

  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  if (!res.ok || text.includes("accounts.google.com/ServiceLogin")) return [];

  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const raw: Record<string, string> = {};
    headers.forEach((h, i) => {
      raw[h] = cols[i] || "";
    });
    rows.push(raw);
  }
  return rows;
}

async function importOperationsRows(rows: Record<string, string>[]): Promise<number> {
  const supabase = getAdminClient();
  if (!supabase || !rows.length) return 0;

  let count = 0;
  for (const raw of rows) {
    const lower: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      lower[k.toLowerCase().replace(/\s+/g, "_")] = String(v || "").trim();
    }
    const job_no =
      lower.job_no || lower.job_number || lower.job_id || lower.order_no || "";
    if (!job_no) continue;

    const clientLabel = lower.client_name || lower.client || "";
    let client_id: string | null = null;
    if (clientLabel) {
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .ilike("company_name", clientLabel)
        .maybeSingle();
      client_id = client?.id ?? null;
    }

    const payload = {
      job_no,
      status: lower.status || lower.job_status || "Created",
      client_id,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("jobs")
      .select("id")
      .eq("job_no", job_no)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase.from("jobs").update(payload).eq("id", existing.id);
      if (!error) count++;
    } else {
      const { error } = await supabase.from("jobs").insert(payload);
      if (!error) count++;
    }
  }
  return count;
}

async function importFinanceRows(rows: Record<string, string>[]): Promise<number> {
  const supabase = getAdminClient();
  if (!supabase || !rows.length) return 0;

  const { error: tableErr } = await supabase
    .from("finance_import_queue")
    .select("id", { head: true, count: "exact" });
  if (tableErr) return 0;

  const payload = rows
    .map((raw) => {
      const lower: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw)) {
        lower[k.toLowerCase().replace(/\s+/g, "_")] = String(v || "").trim();
      }
      const description =
        lower.description || lower.particulars || lower.narration || lower.ledger || lower.name || "";
      const debit = parseFloat(lower.debit || "0") || 0;
      const credit = parseFloat(lower.credit || "0") || 0;
      const amount =
        parseFloat(lower.amount || "0") ||
        parseFloat(lower.outstanding_amount || "0") ||
        parseFloat(lower.balance || "0") ||
        parseFloat(lower.closing_balance || "0") ||
        Math.max(debit, credit) ||
        0;
      if (!description && amount === 0) return null;
      return {
        company:
          lower.company ||
          lower.company_name ||
          "Flexiflair Tech Private Limited",
        record_type: lower.data_type || lower.record_type || lower.voucher_type || "ledger",
        description,
        amount,
        voucher_date: lower.voucher_date || lower.date || null,
        voucher_no: lower.voucher_no || lower.voucher_number || null,
        voucher_type: lower.voucher_type || null,
        ledger_name: lower.ledger_name || lower.ledger || null,
        party_name: lower.party_name || lower.party || null,
        debit,
        credit,
        reference: lower.reference || lower.ref || null,
        narration: lower.narration || lower.narration_text || null,
        gst_no: lower.gst_no || lower.gstin || null,
        status: "queued" as const,
        source: "tally" as const,
      };
    })
    .filter(Boolean) as Array<{
    company: string | null;
    record_type: string;
    description: string;
    amount: number;
    voucher_date: string | null;
    voucher_no: string | null;
    voucher_type: string | null;
    ledger_name: string | null;
    party_name: string | null;
    debit: number;
    credit: number;
    reference: string | null;
    narration: string | null;
    gst_no: string | null;
    status: "queued";
    source: "tally";
  }>;

  if (!payload.length) return 0;
  const { data, error } = await supabase
    .from("finance_import_queue")
    .insert(payload)
    .select("id");
  return error ? 0 : data?.length || 0;
}

async function importClientsRows(rows: Record<string, string>[]): Promise<number> {
  const supabase = getAdminClient();
  if (!supabase || !rows.length) return 0;

  let count = 0;
  for (const raw of rows) {
    const lower: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      lower[k.toLowerCase().replace(/\s+/g, "_")] = String(v || "").trim();
    }
    const company_name =
      lower.company_name || lower.company || lower.business_name || "";
    if (!company_name) continue;

    const payload = {
      client_code: lower.client_code || lower.code || null,
      company_name,
      contact_person: lower.contact_person || lower.contact || null,
      mobile: lower.mobile || lower.phone || null,
      email: lower.email || null,
      gst_no: lower.gst_no || lower.gstin || null,
      address: lower.address || null,
      credit_limit: parseFloat(lower.credit_limit || "0") || 0,
      status: lower.status || "Active",
      updated_at: new Date().toISOString(),
    };

    const code = payload.client_code;
    let existingQuery = supabase.from("clients").select("id");
    if (code) {
      existingQuery = existingQuery.eq("client_code", code);
    } else {
      existingQuery = existingQuery.ilike("company_name", company_name);
    }
    const { data: existing } = await existingQuery.maybeSingle();

    if (existing?.id) {
      const { error } = await supabase.from("clients").update(payload).eq("id", existing.id);
      if (!error) count++;
    } else {
      const { error } = await supabase.from("clients").insert(payload);
      if (!error) count++;
    }
  }
  return count;
}

async function importFollowupsRows(rows: Record<string, string>[]): Promise<number> {
  const supabase = getAdminClient();
  if (!supabase || !rows.length) return 0;

  let count = 0;
  for (const raw of rows) {
    const lower: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      lower[k.toLowerCase().replace(/\s+/g, "_")] = String(v || "").trim();
    }
    const company_name = lower.company_name || lower.company || "";
    if (!company_name) continue;

    const payload = {
      company_name,
      contact_person: lower.contact_person || lower.contact || null,
      next_followup: lower.next_followup || lower.followup_date || null,
      status: lower.status || "Pending",
      notes: lower.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("followups").insert(payload);
    if (!error) count++;
  }
  return count;
}

/** Pull all configured sheet tabs into FBOS (hub sync — run last in Sync All) */
export async function syncGSheetHub(): Promise<HubPullResult> {
  const sheetId = getGoogleSheetId();
  const tabs = getSheetTabGids();
  const tabsSynced: string[] = [];

  const leadResult = await syncGSheet();
  if (leadResult.ok) tabsSynced.push(`leads (${tabs.leads})`);

  let operationsImported = 0;
  if (tabs.operations) {
    const opRows = await fetchRawRows(tabs.operations);
    operationsImported = await importOperationsRows(opRows);
    if (opRows.length) tabsSynced.push(`operations (${tabs.operations})`);
  }

  let financeImported = 0;
  if (tabs.finance) {
    const supabase = getAdminClient();
    if (supabase) {
      await supabase.from("finance_import_queue").delete().eq("source", "tally");
    }
    const finRows = await fetchRawRows(tabs.finance);
    financeImported = await importFinanceRows(finRows);
    if (finRows.length) tabsSynced.push(`finance (${tabs.finance})`);
  }

  let clientsImported = 0;
  if (tabs.clients) {
    const clientRows = await fetchRawRows(tabs.clients);
    clientsImported = await importClientsRows(clientRows);
    if (clientRows.length) tabsSynced.push(`clients (${tabs.clients})`);
  }

  let followupsImported = 0;
  if (tabs.followups) {
    const fuRows = await fetchRawRows(tabs.followups);
    followupsImported = await importFollowupsRows(fuRows);
    if (fuRows.length) tabsSynced.push(`followups (${tabs.followups})`);
  }

  const extraParts = [
    operationsImported ? `ops ${operationsImported}` : "",
    financeImported ? `finance ${financeImported}` : "",
    clientsImported ? `clients ${clientsImported}` : "",
    followupsImported ? `followups ${followupsImported}` : "",
  ].filter(Boolean);
  const extra = extraParts.length ? ` · ${extraParts.join(" · ")}` : "";

  return {
    ...leadResult,
    operationsImported,
    financeImported,
    clientsImported,
    followupsImported,
    tabsSynced,
    message: leadResult.ok
      ? `${leadResult.message}${extra}${sheetId ? ` · tabs: ${tabsSynced.join(", ") || "leads only"}` : ""}`
      : leadResult.message,
  };
}
