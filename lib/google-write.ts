import { getGoogleWebappUrl } from "@/lib/google-config";

export type SheetWriteAction = "lead" | "tally_finance" | "clickup_task";

export async function pushToGoogleSheet(payload: {
  action: SheetWriteAction;
  tab?: "leads" | "finance" | "operations";
  records: Record<string, unknown>[];
}): Promise<{ ok: boolean; message: string; data?: unknown }> {
  const url = getGoogleWebappUrl();
  if (!url) {
    return {
      ok: false,
      message:
        "GOOGLE_WEBAPP_URL not set — Tally/ClickUp cannot write to sheet. Deploy Apps Script web app.",
    };
  }

  try {
    const body = JSON.stringify(payload);
    const headers = { "Content-Type": "application/json" };
    let res = await fetch(url, {
      method: "POST",
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (location) {
        res = await fetch(location, {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(15000),
        });
      }
    }
    const data = await res.json().catch(() => null);
    return {
      ok: res.ok,
      message: res.ok
        ? `Sheet write OK (${payload.action}, ${payload.records.length} row(s))`
        : `Sheet write failed (${res.status})`,
      data,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Sheet write failed",
    };
  }
}

export async function pushLeadToGoogle(lead: {
  company_name?: string;
  contact_person?: string;
  mobile?: string;
}) {
  const result = await pushToGoogleSheet({
    action: "lead",
    tab: "leads",
    records: [lead],
  });
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function pushTallyRecordsToSheet(
  records: Array<{
    company?: string;
    description?: string;
    amount?: number;
    voucher_date?: string | null;
    record_type?: string;
  }>
) {
  return pushToGoogleSheet({
    action: "tally_finance",
    tab: "finance",
    records: records.map((r) => ({ ...r, source: "tally_cloud" })),
  });
}