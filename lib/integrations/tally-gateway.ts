import {
  isLocalTallyHost,
  normalizeTallyHost,
  allowLocalTally,
} from "@/lib/integrations/tally-config";

export type TallyGatewayTestResult = {
  ok: boolean;
  endpoint: string;
  reachable: boolean;
  message: string;
  statusCode?: number;
  responsePreview?: string;
};

export async function testTallyGateway(
  host: string,
  port: string,
  company?: string
): Promise<TallyGatewayTestResult> {
  const normalized = normalizeTallyHost(host);
  const endpoint = `http://${normalized}:${port}`;

  if (!normalized) {
    return {
      ok: false,
      endpoint,
      reachable: false,
      message: "Tally cloud host is empty — enter IP or hostname",
    };
  }

  if (isLocalTallyHost(normalized) && !allowLocalTally()) {
    return {
      ok: false,
      endpoint,
      reachable: false,
      message:
        "TALLY_HOST is localhost — set TALLY_ALLOW_LOCAL=true when Tally runs on this same machine",
    };
  }

  const companyTag = company?.trim()
    ? `<SVCURRENTCOMPANY>${company.trim()}</SVCURRENTCOMPANY>`
    : "";

  const xml = `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Ledgers</ID></HEADER><BODY><DESC><STATICVARIABLES>${companyTag}</STATICVARIABLES></DESC></BODY></ENVELOPE>`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: xml,
      signal: AbortSignal.timeout(12000),
    });

    const text = (await res.text()).slice(0, 500);
    const reachable = res.status < 500;

    if (reachable && res.ok) {
      return {
        ok: true,
        endpoint,
        reachable: true,
        statusCode: res.status,
        responsePreview: text,
        message: `Gateway OK at ${endpoint}${company ? ` (company: ${company})` : ""}`,
      };
    }

    return {
      ok: false,
      endpoint,
      reachable,
      statusCode: res.status,
      responsePreview: text,
      message: reachable
        ? `Gateway responded ${res.status} at ${endpoint} — check XML gateway & company name`
        : `Gateway error ${res.status} at ${endpoint}`,
    };
  } catch (err) {
    return {
      ok: false,
      endpoint,
      reachable: false,
      message:
        err instanceof Error
          ? `Cannot reach ${endpoint} — ${err.message}`
          : `Cannot reach ${endpoint}`,
    };
  }
}
