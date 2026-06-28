/**
 * Tally ERP/Prime XML API Client
 * Connects to Tally via HTTP XML interface
 */

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
}

function getTallyConfig(): TallyConfig | null {
  const host = process.env.TALLY_HOST;
  const port = process.env.TALLY_PORT;
  const companyName = process.env.TALLY_COMPANY_NAME;

  if (!host || !port || !companyName) {
    return null;
  }

  return {
    host,
    port: parseInt(port, 10),
    companyName,
  };
}

function getTallyUrl(): string | null {
  const config = getTallyConfig();
  if (!config) return null;
  return `http://${config.host}:${config.port}`;
}

/**
 * Send XML request to Tally
 */
export async function sendTallyRequest(xml: string): Promise<TallyResponse> {
  const url = getTallyUrl();
  if (!url) {
    return { success: false, error: 'Tally not configured' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const text = await response.text();
    return { success: true, data: text };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Test Tally connection
 */
export async function testTallyConnection(): Promise<TallyResponse> {
  const xml = `
    <ENVELOPE>
      <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
      </HEADER>
      <BODY>
        <EXPORTDATA>
          <REQUESTDESC>
            <STATICVARIABLES>
              <SVCURRENTCOMPANY>${escapeXml(process.env.TALLY_COMPANY_NAME || '')}</SVCURRENTCOMPANY>
            </STATICVARIABLES>
            <REPORTNAME>List of Accounts</REPORTNAME>
            <SVGREPORTNAME>List of Accounts</SVGREPORTNAME>
          </REQUESTDESC>
        </EXPORTDATA>
      </BODY>
    </ENVELOPE>
  `;

  return sendTallyRequest(xml);
}

/**
 * Get company info from Tally
 */
export async function getTallyCompanyInfo(): Promise<TallyResponse> {
  const xml = `
    <ENVELOPE>
      <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
      </HEADER>
      <BODY>
        <EXPORTDATA>
          <REQUESTDESC>
            <STATICVARIABLES>
              <SVCURRENTCOMPANY>${escapeXml(process.env.TALLY_COMPANY_NAME || '')}</SVCURRENTCOMPANY>
            </STATICVARIABLES>
            <REPORTNAME>Balance Sheet</REPORTNAME>
          </REQUESTDESC>
        </EXPORTDATA>
      </BODY>
    </ENVELOPE>
  `;

  return sendTallyRequest(xml);
}

/**
 * Get list of ledgers from Tally
 */
export async function getTallyLedgers(): Promise<TallyResponse> {
  const config = getTallyConfig();
  if (!config) return { success: false, error: 'Tally not configured' };

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

  return sendTallyRequest(xml);
}

/**
 * Push voucher to Tally
 */
export async function pushVoucherToTally(voucher: TallyVoucher): Promise<TallyResponse> {
  const config = getTallyConfig();
  if (!config) return { success: false, error: 'Tally not configured' };

  const xml = `
    <ENVELOPE>
      <HEADER>
        <TALLYREQUEST>Import Data</TALLYREQUEST>
      </HEADER>
      <BODY>
        <IMPORTDATA>
          <REQUESTDESC>
            <REPORTNAME>All Masters</REPORTNAME>
          </REQUESTDESC>
          <REQUESTDATA>
            <TALLYMESSAGE xmlns:UDF="TallyUDF">
              <VOUCHER VCHTYPE="${escapeXml(voucher.voucherType)}" ACTION="Create">
                <DATE>${escapeXml(voucher.date)}</DATE>
                <VOUCHERTYPENAME>${escapeXml(voucher.voucherType)}</VOUCHERTYPENAME>
                <REFERENCE>${escapeXml(voucher.voucherNo)}</REFERENCE>
                <NARRATION>${escapeXml(voucher.narration || '')}</NARRATION>
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

  return sendTallyRequest(xml);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const tallyClient = {
  testConnection: testTallyConnection,
  getCompanyInfo: getTallyCompanyInfo,
  getLedgers: getTallyLedgers,
  pushVoucher: pushVoucherToTally,
  getConfig: getTallyConfig,
  getUrl: getTallyUrl,
};