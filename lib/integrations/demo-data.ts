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
            <PARTYLEDGERNAME>ABC Corp</PARTYLEDGERNAME>
            <AMOUNT>125000.00</AMOUNT>
            <NARRATION>Advance against order #1042</NARRATION>
          </VOUCHER>
          <VOUCHER VCHTYPE="Payment" ACTION="Create">
            <DATE>20260605</DATE>
            <PARTYLEDGERNAME>Raw Material Supplier</PARTYLEDGERNAME>
            <AMOUNT>-45000.00</AMOUNT>
            <NARRATION>Fabric purchase — batch 88</NARRATION>
          </VOUCHER>
          <VOUCHER VCHTYPE="Sales" ACTION="Create">
            <DATE>20260608</DATE>
            <PARTYLEDGERNAME>XYZ Retail</PARTYLEDGERNAME>
            <AMOUNT>89000.00</AMOUNT>
            <NARRATION>Invoice #INV-2026-041</NARRATION>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

export function parseTallyDemoXml(xml: string) {
  const vouchers: Array<{
    record_type: string;
    description: string;
    amount: number;
    voucher_date: string | null;
  }> = [];

  const voucherBlocks = xml.match(/<VOUCHER[\s\S]*?<\/VOUCHER>/gi) || [];
  for (const block of voucherBlocks) {
    const type = block.match(/VCHTYPE="([^"]+)"/i)?.[1] || "ledger";
    const dateRaw = block.match(/<DATE>(\d+)<\/DATE>/i)?.[1];
    const party = block.match(/<PARTYLEDGERNAME>([^<]+)<\/PARTYLEDGERNAME>/i)?.[1]?.trim();
    const amountRaw = block.match(/<AMOUNT>([-\d.]+)<\/AMOUNT>/i)?.[1];
    const narration = block.match(/<NARRATION>([^<]+)<\/NARRATION>/i)?.[1]?.trim();

    let voucher_date: string | null = null;
    if (dateRaw && dateRaw.length === 8) {
      voucher_date = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`;
    }

    vouchers.push({
      record_type: type.toLowerCase(),
      description: narration || party || type,
      amount: amountRaw ? parseFloat(amountRaw) : 0,
      voucher_date,
    });
  }

  return vouchers;
}
