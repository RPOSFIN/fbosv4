import { ingestTallyFinanceRecords } from "@/lib/integrations/tally-finance-ingest";
import { NextResponse } from "next/server";

function unauthorized() {
  return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
}

/** POST — TallyToSheet.ps1 fallback when Google Apps Script doPost returns 405 */
export async function POST(request: Request) {
  const secret =
    process.env.SHEET_SYNC_SECRET?.trim() ||
    process.env.GOOGLE_APPS_SCRIPT_SECRET?.trim();

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  let body: {
    action?: string;
    secret?: string;
    dryRun?: boolean;
    records?: Record<string, unknown>[];
    rows?: Record<string, unknown>[];
  } = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const bodySecret = String(body.secret || "");
  if (!secret || (token !== secret && bodySecret !== secret)) {
    return unauthorized();
  }

  const action = body.action || "tally_finance";
  if (action !== "tally_finance" && action !== "tally_finance_sync") {
    return NextResponse.json(
      { ok: false, message: "Use action tally_finance with records[]" },
      { status: 400 }
    );
  }

  const records = body.records || body.rows || [];
  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json(
      { ok: false, message: "records[] required" },
      { status: 400 }
    );
  }

  if (body.dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      records: records.length,
      syncedAt: new Date().toISOString(),
    });
  }

  try {
    const verifiedSecret = token === secret ? token : bodySecret;
    const result = await ingestTallyFinanceRecords(records, verifiedSecret);
    return NextResponse.json({
      ok: true,
      inserted: result.inserted,
      source: result.source,
      records: records.length,
      sheetWrite: result.sheetWrite,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingest failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/webhooks/tally-finance",
    method: "POST",
    auth: "Authorization: Bearer SHEET_SYNC_SECRET (or body.secret)",
    action: "tally_finance",
    note: "Use when Google Apps Script webapp POST returns 405",
  });
}
