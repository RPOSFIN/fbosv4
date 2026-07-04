export const CLICKUP_DEMO = {
  teams: [
    { id: "demo-team-1", name: "Flexiflair Sales (Demo)" },
  ],
  spaces: [
    { id: "demo-space-1", name: "Pipeline (Demo)" },
    { id: "demo-space-2", name: "Operations (Demo)" },
  ],
  lists: [
    { id: "demo-list-1", name: "Hot Leads", space_id: "demo-space-1" },
    { id: "demo-list-2", name: "Follow-ups", space_id: "demo-space-1" },
  ],
  tasks: [
    { id: "demo-task-1", name: "Quote for ABC Corp", status: "in progress", list_id: "demo-list-1" },
    { id: "demo-task-2", name: "Sample dispatch — XYZ Ltd", status: "open", list_id: "demo-list-1" },
    { id: "demo-task-3", name: "Payment follow-up — PQR Industries", status: "review", list_id: "demo-list-2" },
  ],
};

export const TALLY_DEMO_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC><REPORTNAME>Ledger Vouchers</REPORTNAME><STATICVARIABLES>
        <SVCURRENTCOMPANY>Flexiflair Demo Co</SVCURRENTCOMPANY>
      </STATICVARIABLES></REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <VOUCHER VCHTYPE="Receipt" ACTION="Create">
            <DATE>20260601</DATE>
            <VOUCHERNUMBER>REC-1042</VOUCHERNUMBER>
            <REFERENCE>ORDER-1042</REFERENCE>
            <PARTYLEDGERNAME>ABC Corp</PARTYLEDGERNAME>
            <PARTYGSTIN>27ABCDE1234F1Z5</PARTYGSTIN>
            <NARRATION>Advance against order #1042</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>ABC Corp</LEDGERNAME>
              <AMOUNT>125000.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
          <VOUCHER VCHTYPE="Payment" ACTION="Create">
            <DATE>20260605</DATE>
            <VOUCHERNUMBER>PAY-0088</VOUCHERNUMBER>
            <PARTYLEDGERNAME>Raw Material Supplier</PARTYLEDGERNAME>
            <NARRATION>Fabric purchase — batch 88</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Raw Material Supplier</LEDGERNAME>
              <AMOUNT>-45000.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
          <VOUCHER VCHTYPE="Sales" ACTION="Create">
            <DATE>20260608</DATE>
            <VOUCHERNUMBER>INV-2026-041</VOUCHERNUMBER>
            <REFERENCE>INV-2026-041</REFERENCE>
            <PARTYLEDGERNAME>XYZ Retail</PARTYLEDGERNAME>
            <NARRATION>Invoice #INV-2026-041</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>XYZ Retail</LEDGERNAME>
              <AMOUNT>89000.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

export type TallyFinanceRecord = {
  company?: string;
  record_type: string;
  description: string;
  amount: number;
  voucher_date: string | null;
  voucher_no?: string | null;
  voucher_type?: string | null;
  ledger_name?: string | null;
  party_name?: string | null;
  debit?: number;
  credit?: number;
  reference?: string | null;
  narration?: string | null;
  gst_no?: string | null;
  source?: "demo" | "tally" | "xml";
  raw_xml?: string;
};

type ParseOptions = {
  company?: string;
  source?: "demo" | "tally" | "xml";
  rawXmlLimit?: number;
};

function readTag(xml: string, tag: string): string | null {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() || null;
}

function readFirstTag(xml: string, tags: string[]): string | null {
  for (const tag of tags) {
    const value = readTag(xml, tag);
    if (value) return decodeXml(value);
  }
  return null;
}

function readAttr(xml: string, attr: string): string | null {
  const match = xml.match(new RegExp(`${attr}=["']([^"']+)["']`, "i"));
  return match?.[1]?.trim() || null;
}

function decodeXml(value: string): string {
  return value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .trim();
}

function parseAmount(value: string | null): number {
  if (!value) return 0;
  const normalized = value.replace(/,/g, "").replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(dateRaw: string | null): string | null {
  if (!dateRaw) return null;
  const cleaned = dateRaw.replace(/[^0-9]/g, "");
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
  }
  return null;
}

function extractVoucherBlocks(xml: string): string[] {
  return xml.match(/<VOUCHER[\s\S]*?<\/VOUCHER>/gi) || [];
}

function extractLedgerEntries(block: string) {
  const entryBlocks = block.match(/<ALLLEDGERENTRIES\.LIST[\s\S]*?<\/ALLLEDGERENTRIES\.LIST>/gi) || [];
  return entryBlocks.map((entry) => ({
    ledgerName: readFirstTag(entry, ["LEDGERNAME"]),
    amount: parseAmount(readFirstTag(entry, ["AMOUNT"])),
  }));
}

export function parseTallyXml(
  xml: string,
  options: ParseOptions = {}
): TallyFinanceRecord[] {
  const vouchers: TallyFinanceRecord[] = [];
  const voucherBlocks = extractVoucherBlocks(xml);
  const company =
    options.company || readFirstTag(xml, ["SVCURRENTCOMPANY", "COMPANYNAME", "CMPNAME"]) || undefined;

  for (const block of voucherBlocks) {
    const voucherType =
      readAttr(block, "VCHTYPE") ||
      readFirstTag(block, ["VOUCHERTYPENAME", "VOUCHERTYPE", "VCHTYPE"]);
    const voucherNo = readFirstTag(block, ["VOUCHERNUMBER", "VOUCHERNO", "NUMBER"]);
    const reference = readFirstTag(block, ["REFERENCE", "REFERENCENO", "BILLREFERENCE"]);
    const partyName = readFirstTag(block, ["PARTYLEDGERNAME", "PARTYNAME", "BASICBUYERNAME"]);
    const narration = readFirstTag(block, ["NARRATION"]);
    const gstNo = readFirstTag(block, ["PARTYGSTIN", "GSTIN", "GSTREGISTRATIONNO", "GSTNO"]);
    const voucher_date = parseDate(readFirstTag(block, ["DATE", "VOUCHERDATE"]));
    const ledgerEntries = extractLedgerEntries(block);
    const firstLedger = ledgerEntries.find((entry) => entry.ledgerName) || ledgerEntries[0];
    const directAmount = parseAmount(readFirstTag(block, ["AMOUNT"]));
    const ledgerTotal = ledgerEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const amount = ledgerEntries.length ? ledgerTotal : directAmount;
    const debit = ledgerEntries.length
      ? ledgerEntries.filter((entry) => entry.amount < 0).reduce((sum, entry) => sum + Math.abs(entry.amount), 0)
      : amount < 0
        ? Math.abs(amount)
        : 0;
    const credit = ledgerEntries.length
      ? ledgerEntries.filter((entry) => entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0)
      : amount > 0
        ? amount
        : 0;
    const recordType = (voucherType || "ledger").toLowerCase();
    const description = narration || reference || voucherNo || partyName || firstLedger?.ledgerName || voucherType || "Tally voucher";

    vouchers.push({
      company,
      record_type: recordType,
      description,
      amount,
      voucher_date,
      voucher_no: voucherNo,
      voucher_type: voucherType,
      ledger_name: firstLedger?.ledgerName || partyName || null,
      party_name: partyName || firstLedger?.ledgerName || null,
      debit,
      credit,
      reference,
      narration,
      gst_no: gstNo,
      source: options.source,
      raw_xml: block.slice(0, options.rawXmlLimit ?? 2000),
    });
  }

  return vouchers;
}

export function parseTallyDemoXml(xml: string) {
  return parseTallyXml(xml, { source: "demo", rawXmlLimit: 500 });
}
