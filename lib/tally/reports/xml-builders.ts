import { getTallyReportDefinition } from "@/lib/tally/reports/definitions";
import type { TallyReportKey } from "@/lib/tally/canonical/tally-types";

export type TallyXmlRequestInput = {
  company: string;
  from: string;
  to: string;
  report: TallyReportKey;
  party?: string | null;
  ledger?: string | null;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function tallyDate(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

function staticVariables(input: TallyXmlRequestInput): string {
  const ledgerName = input.ledger || input.party || "";
  return `<STATICVARIABLES>
  <SVCURRENTCOMPANY>${escapeXml(input.company)}</SVCURRENTCOMPANY>
  <SVFROMDATE TYPE="Date">${tallyDate(input.from)}</SVFROMDATE>
  <SVTODATE TYPE="Date">${tallyDate(input.to)}</SVTODATE>
  <EXPLODEFLAG>Yes</EXPLODEFLAG>
  ${ledgerName ? `<LEDGERNAME>${escapeXml(ledgerName)}</LEDGERNAME>` : ""}
</STATICVARIABLES>`;
}

function voucherCollection(input: TallyXmlRequestInput, voucherType: string): string {
  const collectionName = `FBOS${input.report.replace(/_/g, "")}Vouchers`;
  const formulaName = `FBOSOnly${input.report.replace(/_/g, "")}`;
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>${collectionName}</ID>
  </HEADER>
  <BODY>
    <DESC>
      ${staticVariables(input)}
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="${collectionName}" ISMODIFY="No">
            <TYPE>Voucher</TYPE>
            <FETCH>GUID,DATE,VOUCHERTYPENAME,VOUCHERNUMBER,REFERENCE,PARTYLEDGERNAME,PARTYGSTIN,NARRATION,ALLLEDGERENTRIES.LIST,LEDGERNAME,AMOUNT,BILLALLOCATIONS.LIST,INVENTORYENTRIES.LIST,STOCKITEMNAME,BILLEDQTY,RATE,GSTRATE,TAXAMOUNT</FETCH>
            <FILTERS>${formulaName}</FILTERS>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="${formulaName}">$VOUCHERTYPENAME = "${escapeXml(voucherType)}"</SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
}

function ledgerCollection(input: TallyXmlRequestInput): string {
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>FBOSLedgers</ID>
  </HEADER>
  <BODY>
    <DESC>
      ${staticVariables(input)}
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="FBOSLedgers" ISMODIFY="No">
            <TYPE>Ledger</TYPE>
            <FETCH>NAME,PARENT,OPENINGBALANCE,CLOSINGBALANCE,GSTREGISTRATIONNO,MAILINGNAME,EMAIL,LEDGERMOBILE,ADDRESS.LIST</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
}

function reportExport(input: TallyXmlRequestInput): string {
  const definition = getTallyReportDefinition(input.report);
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>${escapeXml(definition.tallyReportName)}</REPORTNAME>
        ${staticVariables(input)}
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
}

function mixedVoucherCollection(input: TallyXmlRequestInput): string {
  const types = [
    "Sales",
    "Purchase",
    "Receipt",
    "Payment",
    "Journal",
    "Contra",
    "Debit Note",
    "Credit Note",
  ];
  const checks = types
    .map((type) => `$VOUCHERTYPENAME = "${escapeXml(type)}"`)
    .join(" OR ");
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>FBOSFinanceVouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      ${staticVariables(input)}
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="FBOSFinanceVouchers" ISMODIFY="No">
            <TYPE>Voucher</TYPE>
            <FETCH>GUID,DATE,VOUCHERTYPENAME,VOUCHERNUMBER,REFERENCE,PARTYLEDGERNAME,PARTYGSTIN,NARRATION,ALLLEDGERENTRIES.LIST,LEDGERNAME,AMOUNT,BILLALLOCATIONS.LIST,INVENTORYENTRIES.LIST,STOCKITEMNAME,BILLEDQTY,RATE,GSTRATE,TAXAMOUNT</FETCH>
            <FILTERS>FBOSFinanceVoucherTypes</FILTERS>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="FBOSFinanceVoucherTypes">${checks}</SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
}

export function buildTallyXmlRequest(input: TallyXmlRequestInput): string {
  const definition = getTallyReportDefinition(input.report);

  if (definition.category === "ledger") return ledgerCollection(input);
  if (definition.voucherType) return voucherCollection(input, definition.voucherType);
  if (input.report === "party_summary" || input.report === "party_withdrawal") {
    return mixedVoucherCollection(input);
  }
  return reportExport(input);
}
