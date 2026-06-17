import {

  getGSheetCsvUrl,

  getGSheetFixSteps,

  getGoogleSheetId,

  getGoogleWebappUrl,

  isExplicitWebappUrl,

} from "@/lib/google-config";

import { getGSheetConfig } from "@/lib/integrations/config";
import { importLeadsWithDedupe, type LeadUpsertResult } from "@/lib/leads/dedupe";



export type GSheetSyncResult = {

  ok: boolean;

  demo?: boolean;

  message: string;

  healthCheck?: boolean;

  leadsImported?: number;

  leadsUpdated?: number;

  leadsSkipped?: number;

  inserted?: number;

  updated?: number;

  skipped?: number;

  clientsImported?: number;

  response?: unknown;

  fixSteps?: string[];

  source?: "webapp" | "csv";

};



type SheetRow = {

  company_name?: string;

  contact_person?: string;

  mobile?: string;

  email?: string;

  status?: string;

  source?: string;

};



function normalizeRow(raw: Record<string, string>): SheetRow | null {

  const lower: Record<string, string> = {};

  for (const [k, v] of Object.entries(raw)) {

    lower[k.toLowerCase().replace(/\s+/g, "_")] = String(v || "").trim();

  }



  const company_name =

    lower.company_name ||

    lower.company ||

    lower.business_name ||

    lower.client_name ||

    "";

  if (!company_name) return null;



  return {

    company_name,

    contact_person:

      lower.contact_person || lower.contact || lower.person || lower.name,

    mobile:

      lower.mobile ||

      lower.phone ||

      lower.contact_number ||

      lower.contact_no,

    email: lower.email,

    status: lower.status || lower.lead_status || "NEW",

    source: lower.source || lower.lead_source || "Google Sheets",

  };

}



function extractRows(data: unknown): SheetRow[] {

  if (!data) return [];



  if (Array.isArray(data)) {

    return data

      .map((row) =>

        typeof row === "object" && row

          ? normalizeRow(row as Record<string, string>)

          : null

      )

      .filter(Boolean) as SheetRow[];

  }



  if (typeof data === "object") {

    const obj = data as Record<string, unknown>;

    const candidates = [obj.data, obj.leads, obj.rows, obj.records];

    for (const c of candidates) {

      if (Array.isArray(c)) return extractRows(c);

    }

  }



  return [];

}



async function importRowsToSupabase(rows: SheetRow[]): Promise<LeadUpsertResult> {
  if (!rows.length) {
    return {
      leadsImported: 0,
      leadsUpdated: 0,
      leadsSkipped: 0,
      clientsImported: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
    };
  }

  const leadsPayload = rows.map((r) => ({
    company_name: r.company_name!,
    contact_person: r.contact_person,
    mobile: r.mobile,
    email: r.email,
    status: r.status || "NEW",
    source: r.source || "Google Sheets",
  }));

  return importLeadsWithDedupe(leadsPayload);
}



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
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cols.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  cols.push(current.trim());
  return cols;
}

async function syncFromCsvUrl(): Promise<{ rows: SheetRow[]; status?: number }> {

  const csvUrl = getGSheetCsvUrl();

  if (!csvUrl) return { rows: [] };



  const res = await fetch(csvUrl, { cache: "no-store" });

  const text = await res.text();

  const looksLikeLogin =

    text.includes("accounts.google.com/ServiceLogin") ||

    (text.trimStart().startsWith("<!DOCTYPE") && text.includes("login"));



  if (!res.ok || looksLikeLogin) {

    const status = looksLikeLogin ? 401 : res.status;

    const err = new Error(

      looksLikeLogin

        ? "CSV fetch blocked (401) — sheet needs Viewer sharing or correct tab gid; /export URLs also need Publish to web"

        : `CSV fetch failed (${res.status})`

    ) as Error & { status?: number };

    err.status = status;

    throw err;

  }

  const lines = text.split(/\r?\n/).filter(Boolean);

  if (lines.length < 2) return { rows: [] };



  const headers = parseCsvLine(lines[0]);

  const rows: SheetRow[] = [];

  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const raw: Record<string, string> = {};

    headers.forEach((h, i) => {
      raw[h] = cols[i] || "";
    });

    const normalized = normalizeRow(raw);

    if (normalized) rows.push(normalized);

  }



  return { rows };

}



async function syncFromWebapp(): Promise<{

  rows: SheetRow[];

  healthOnly: boolean;

  status: number;

  data: unknown;

}> {

  const webappUrl = getGoogleWebappUrl();

  if (!webappUrl) {

    return { rows: [], healthOnly: false, status: 0, data: null };

  }



  const res = await fetch(webappUrl, { cache: "no-store" });

  const data = await res.json().catch(() => null);



  if (!res.ok) {

    const err = new Error(`Google Sheets webapp error (${res.status})`) as Error & {

      status?: number;

      response?: unknown;

    };

    err.status = res.status;

    err.response = data;

    throw err;

  }



  const rows = extractRows(data);

  const healthOnly =

    Boolean(data) &&

    typeof data === "object" &&

    (data as { success?: boolean }).success === true &&

    !rows.length;



  return { rows, healthOnly, status: res.status, data };

}



function buildSuccessResult(

  rows: SheetRow[],

  imported: LeadUpsertResult,

  opts: { healthOnly?: boolean; source: "webapp" | "csv"; data?: unknown }

): GSheetSyncResult {

  const parts = [`Google Sheets connected via ${opts.source}`];

  if (opts.healthOnly && !rows.length) parts.push("health check OK");

  const syncParts: string[] = [];
  if (imported.leadsImported) syncParts.push(`${imported.leadsImported} inserted`);
  if (imported.leadsUpdated) syncParts.push(`${imported.leadsUpdated} updated`);
  if (imported.leadsSkipped) syncParts.push(`${imported.leadsSkipped} skipped`);
  if (syncParts.length) parts.push(`Leads: ${syncParts.join(", ")}`);

  if (imported.clientsImported) parts.push(`${imported.clientsImported} client(s) imported`);



  return {

    ok: true,

    healthCheck: opts.healthOnly || undefined,

    leadsImported: imported.leadsImported,

    leadsUpdated: imported.leadsUpdated,

    leadsSkipped: imported.leadsSkipped,

    inserted: imported.inserted,

    updated: imported.updated,

    skipped: imported.skipped,

    clientsImported: imported.clientsImported,

    message: parts.join(" — "),

    response: opts.data,

    source: opts.source,

  };

}



export async function syncGSheet(): Promise<GSheetSyncResult> {

  const { configured } = getGSheetConfig();

  if (!configured) {

    return {

      ok: false,

      message: "Google Sheets not configured — set GOOGLE_WEBAPP_URL or GOOGLE_SHEET_ID in .env.local",

      fixSteps: getGSheetFixSteps(),

    };

  }



  const errors: string[] = [];

  let lastStatus: number | undefined;



  const webappUrl = getGoogleWebappUrl();

  const csvUrl = getGSheetCsvUrl();

  const sheetId = getGoogleSheetId();



  if (webappUrl) {

    try {

      const webapp = await syncFromWebapp();

      if (webapp.rows.length) {

        const imported = await importRowsToSupabase(webapp.rows);

        return buildSuccessResult(webapp.rows, imported, {

          healthOnly: webapp.healthOnly,

          source: "webapp",

          data: webapp.data,

        });

      }

      if (webapp.healthOnly && !csvUrl) {

        return buildSuccessResult([], {
          leadsImported: 0,
          leadsUpdated: 0,
          leadsSkipped: 0,
          clientsImported: 0,
          inserted: 0,
          updated: 0,
          skipped: 0,
        }, {

          healthOnly: true,

          source: "webapp",

          data: webapp.data,

        });

      }

    } catch (err) {

      const status = (err as { status?: number }).status;

      if (status) lastStatus = status;

      errors.push(err instanceof Error ? err.message : "Webapp sync failed");

    }

  } else if (sheetId) {

    errors.push(

      "No GOOGLE_WEBAPP_URL — using gviz CSV fallback (works with Viewer sharing)"

    );

  }



  if (csvUrl) {

    try {

      const csv = await syncFromCsvUrl();

      if (csv.rows.length) {

        const imported = await importRowsToSupabase(csv.rows);

        return buildSuccessResult(csv.rows, imported, { source: "csv" });

      }

      errors.push("CSV fetched but no lead rows found (check column headers: company_name, company, etc.)");

    } catch (err) {

      const status = (err as { status?: number }).status;

      if (status) lastStatus = status;

      errors.push(err instanceof Error ? err.message : "CSV sync failed");

    }

  } else if (!webappUrl) {

    errors.push("No CSV URL — set GOOGLE_SHEET_ID (and optional GOOGLE_SHEET_GID) or GSHEET_CSV_URL");

  }



  const fixSteps = getGSheetFixSteps(lastStatus);

  const message = errors.length

    ? errors.join(" · ")

    : "No rows imported from Google Sheets";



  return {

    ok: false,

    message: `${message}${sheetId ? ` (sheet: ${sheetId})` : ""}`,

    fixSteps,

  };

}



export async function checkGSheetHealth(): Promise<{ ok: boolean; message: string }> {

  const result = await syncGSheet();

  return { ok: result.ok, message: result.message };

}


