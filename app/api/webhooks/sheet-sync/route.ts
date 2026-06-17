import { syncGSheetHub } from "@/lib/integrations/gsheet-hub";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

function unauthorized() {
  return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
}

/** POST — triggered by Google Apps Script (4x daily) or manual curl */
export async function POST(request: Request) {
  const secret =
    process.env.SHEET_SYNC_SECRET?.trim() ||
    process.env.GOOGLE_APPS_SCRIPT_SECRET?.trim();
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  let bodySecret = "";
  try {
    const body = await request.json();
    bodySecret = String(body?.secret || "");
  } catch {
    /* header-only auth */
  }

  if (!secret || (token !== secret && bodySecret !== secret)) {
    return unauthorized();
  }

  const result = await syncGSheetHub();
  const supabase = getAdminClient();
  if (supabase) {
    await supabase.from("sheet_sync_log").insert({
      source: "webhook",
      tab_name: (result.tabsSynced || []).join(", ") || "hub",
      rows_imported:
        (result.leadsImported || 0) +
        (result.operationsImported || 0) +
        (result.financeImported || 0),
      status: result.ok ? "ok" : "error",
      message: result.message,
    });
  }

  return NextResponse.json({
    ok: result.ok,
    syncedAt: new Date().toISOString(),
    ...result,
  });
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/webhooks/sheet-sync",
    method: "POST",
    auth: "Authorization: Bearer SHEET_SYNC_SECRET",
    schedule: "Apps Script triggers 4x daily recommended",
  });
}
