/**
 * Tally ERP/Prime XML API Client
 * Connects to Tally via HTTP XML interface
 */

import {
  DEFAULT_TALLY_COMPANY_NAME,
  DEFAULT_TALLY_PORT,
  getResolvedTallyConfig,
  normalizeTallyHost,
  type ResolvedTallyConfig,
} from "@/lib/integrations/tally-config";

export interface TallyConfig {
  host: string;
  port: number;
  companyName: string;
}

export interface TallyLedger {
  name: string;
  parent: string;
  openingBalance: number;
  closingBalance: number;
}

export interface TallyVoucher {
  voucherNo: string;
  voucherType: string;
  date: string;
  ledgerName: string;
  amount: number;
  narration?: string;
}

export interface TallyResponse {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
  endpoint?: string;
  durationMs?: number;
}

function configFromResolved(resolved: ResolvedTallyConfig): TallyConfig | null {
  if (!resolved.host) return null;
  return {
    host: normalizeTallyHost(resolved.host),
    port: parseInt(resolved.port || DEFAULT_TALLY_PORT, 10),
    companyName: resolved.company || DEFAULT_TALLY_COMPANY_NAME,
  };
}

function getTallyConfig(): TallyConfig | null {
  const host = process.env.TALLY_HOST?.trim() || process.env.TALLY_SERVER_URL?.trim() || "";
  const port = process.env.TALLY_PORT?.trim() || DEFAULT_TALLY_PORT;
  const companyName =
    process.env.TALLY_COMPANY_NAME?.trim() || DEFAULT_TALLY_COMPANY_NAME;

  if (!host) return null;

  return {
    host: normalizeTallyHost(host),
    port: parseInt(port, 10),
    companyName,
  };
}

async function getResolvedClientConfig(): Promise<TallyConfig | null> {
  return configFromResolved(await getResolvedTallyConfig());
}

function getTallyUrl(config = getTallyConfig()): string | null {
  if (!config) return null;
  return `http://${config.host}:${config.port}`;
}

function getTallyTimeoutMs(): number {
  const raw = process.env.TALLY_TIMEOUT_MS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : 30000;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30000;
}

function describeTallyError(err: unknown, url: string, timeoutMs: number): string {
  if (err instanceof DOMException && err.name === "AbortError") {
    return `Tally request timed out after ${timeoutMs}ms at ${url}`;
  }
  if (err instanceof Error && err.name === "AbortError") {
    return `Tally request timed out after ${timeoutMs}ms at ${url}`;
  }
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}

/**
 * Send XML request to Tally
 */
export async function sendTallyRequest(
  xml: string,
  config = getTallyConfig()
): Promise<TallyResponse> {
  const url = getTallyUrl(config);
  if (!url) return { success: false, error: "Tally not configured" };

  const started = Date.now();
  const timeoutMs = getTallyTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: xml,
      signal: controller.signal,
    });

    const text = await response.text();
    const durationMs = Date.now() - started;

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`,
        status: response.status,
        endpoint: url,
        durationMs,
        data: text,
      };
    }

    return {
      success: true,
      data: text,
      status: response.status,
      endpoint: url,
      durationMs,
    };
  } catch (err) {
    return {
      success: false,
      error: describeTallyError(err, url, timeoutMs),
      endpoint: url,
      durationMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Test Tally connection
 */
export async function testTallyConnection(
  config = getTallyConfig()
): Promise<TallyResponse> {
  if (!config) return { success: false, error: "Tally not configured" };

  const xml = `
    <ENVELOPE>
      <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>Company</ID>
      </HEADER>
      <BODY>
        <DESC>
          <STATICVARIABLES>
            <SVCURRENTCOMPANY>${escapeXml(config.companyName)}</SVCURRENTCOMPANY>
          </STATICVARIABLES>
          <TDL>
            <TDLMESSAGE>
              <COLLECTION NAME="Company" ISMODIFY="No">
                <TYPE>Company</TYPE>
                <FETCH>Name</FETCH>
              </COLLECTION>
            </TDLMESSAGE>
          </TDL>
        </DESC>
      </BODY>
    </ENVELOPE>
  `;

  return sendTallyRequest(xml, config);
}

/**
 * Get company info from Tally
 */
export async function getTallyCompanyInfo(
  config = getTallyConfig()
): Promise<TallyResponse> {
  if (!config) return { success: false, error: "Tally not configured" };

  const xml = `
    <ENVELOPE>
      <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
      </HEADER>
      <BODY>
        <EXPORTDATA>
          <REQUESTDESC>
            <STATICVARIABLES>
              <SVCURRENTCOMPANY>${escapeXml(config.companyName)}</SVCURRENTCOMPANY>
            </STATICVARIABLES>
            <REPORTNAME>Balance Sheet</REPORTNAME>
          </REQUESTDESC>
        </EXPORTDATA>
      </BODY>
    </ENVELOPE>
  `;

  return sendTallyRequest(xml, config);
}

/**
 * Get list of ledgers from Tally
 */
export async function getTallyLedgers(
  config = getTallyConfig()
): Promise<TallyResponse> {
  if (!config) return { success: false, error: "Tally not configured" };

  const xml = `
    <ENVELOPE>
      <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
      </HEADER>
      <BODY>
        <EXPORTDATA>
          <REQUESTDESC>
            <REPORTNAME>List of Ledgers</REPORTNAME>
            <STATICVARIABLES>
              <SVCURRENTCOMPANY>${escapeXml(config.companyName)}</SVCURRENTCOMPANY>
            </STATICVARIABLES>
          </REQUESTDESC>
        </EXPORTDATA>
      </BODY>
    </ENVELOPE>
  `;

  return sendTallyRequest(xml, config);
}

/**
 * Push voucher to Tally
 */
export async function pushVoucherToTally(
  voucher: TallyVoucher,
  config = getTallyConfig()
): Promise<TallyResponse> {
  if (!config) return { success: false, error: "Tally not configured" };

  const xml = `
    <ENVELOPE>
      <HEADER>
        <TALLYREQUEST>Import Data</TALLYREQUEST>
      </HEADER>
      <BODY>
        <IMPORTDATA>
          <REQUESTDESC>
            <REPORTNAME>All Masters</REPORTNAME>
            <STATICVARIABLES>
              <SVCURRENTCOMPANY>${escapeXml(config.companyName)}</SVCURRENTCOMPANY>
            </STATICVARIABLES>
          </REQUESTDESC>
          <REQUESTDATA>
            <TALLYMESSAGE xmlns:UDF="TallyUDF">
              <VOUCHER VCHTYPE="${escapeXml(voucher.voucherType)}" ACTION="Create">
                <DATE>${escapeXml(voucher.date)}</DATE>
                <VOUCHERTYPENAME>${escapeXml(voucher.voucherType)}</VOUCHERTYPENAME>
                <REFERENCE>${escapeXml(voucher.voucherNo)}</REFERENCE>
                <NARRATION>${escapeXml(voucher.narration || "")}</NARRATION>
                <ALLLEDGERENTRIES.LIST>
                  <LEDGERNAME>${escapeXml(voucher.ledgerName)}</LEDGERNAME>
                  <AMOUNT>${voucher.amount}</AMOUNT>
                </ALLLEDGERENTRIES.LIST>
              </VOUCHER>
            </TALLYMESSAGE>
          </REQUESTDATA>
        </IMPORTDATA>
      </BODY>
    </ENVELOPE>
  `;

  return sendTallyRequest(xml, config);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const tallyClient = {
  testConnection: testTallyConnection,
  getCompanyInfo: getTallyCompanyInfo,
  getLedgers: getTallyLedgers,
  pushVoucher: pushVoucherToTally,
  getConfig: getTallyConfig,
  getResolvedConfig: getResolvedClientConfig,
  getUrl: getTallyUrl,
};
