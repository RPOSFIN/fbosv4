import { createHash } from "node:crypto";
import {
  type CanonicalLedger,
  type CanonicalParty,
  type CanonicalVoucher,
  type CanonicalVoucherLine,
  type ParsedTallyReport,
  type TallyReportKey,
} from "@/lib/tally/canonical/tally-types";
import {
  parseAmount,
  parseOptionalAmount,
  parseTallyDate,
  readAttr,
  readBlocks,
  readFirstTag,
  readNameAttr,
} from "@/lib/tally/parser/xml";

type Missing = ParsedTallyReport["missingFields"][number];

const BANK_HINTS = ["bank", "hdfc", "icici", "axis", "sbi", "kotak", "current account"];
const CASH_HINTS = ["cash", "petty cash"];
const PARTY_GROUP_HINTS = [
  "sundry debtors",
  "sundry creditors",
  "customer",
  "supplier",
  "vendor",
  "party",
];

function stableHash(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 24);
}

function missing(fields: Array<[string, unknown]>): string[] {
  return fields
    .filter(([, value]) => value === null || value === undefined || value === "")
    .map(([field]) => field);
}

function classifyLedger(name: string | null, parent: string | null, group: string | null) {
  const text = `${name || ""} ${parent || ""} ${group || ""}`.toLowerCase();
  return {
    is_bank: BANK_HINTS.some((hint) => text.includes(hint)),
    is_cash: CASH_HINTS.some((hint) => text.includes(hint)),
    is_party: PARTY_GROUP_HINTS.some((hint) => text.includes(hint)),
  };
}

function debitFor(amount: number): number {
  return amount < 0 ? Math.abs(amount) : 0;
}

function creditFor(amount: number): number {
  return amount > 0 ? amount : 0;
}

function parseLedgerEntries(
  block: string,
  voucher: Pick<CanonicalVoucher, "company" | "voucher_key" | "voucher_no" | "voucher_type" | "voucher_date" | "party_name">
): CanonicalVoucherLine[] {
  return readBlocks(block, "ALLLEDGERENTRIES.LIST").map((entry) => {
    const ledgerName = readFirstTag(entry, ["LEDGERNAME"]);
    const amount = parseAmount(readFirstTag(entry, ["AMOUNT"]));
    return {
      company: voucher.company,
      voucher_key: voucher.voucher_key,
      voucher_no: voucher.voucher_no,
      voucher_type: voucher.voucher_type,
      voucher_date: voucher.voucher_date,
      ledger_name: ledgerName,
      party_name: voucher.party_name || ledgerName,
      line_type: "ledger",
      amount,
      debit: debitFor(amount),
      credit: creditFor(amount),
      item_name: null,
      quantity: null,
      rate: null,
      gst_rate: parseOptionalAmount(readFirstTag(entry, ["GSTRATE", "RATEOFINVOICETAX"])),
      tax_amount: parseOptionalAmount(readFirstTag(entry, ["TAXAMOUNT"])),
      raw_payload: {
        raw_xml: entry.slice(0, 4000),
      },
    };
  });
}

function parseInventoryEntries(
  block: string,
  voucher: Pick<CanonicalVoucher, "company" | "voucher_key" | "voucher_no" | "voucher_type" | "voucher_date" | "party_name">
): CanonicalVoucherLine[] {
  return readBlocks(block, "INVENTORYENTRIES.LIST").map((entry) => {
    const amount = parseAmount(readFirstTag(entry, ["AMOUNT"]));
    return {
      company: voucher.company,
      voucher_key: voucher.voucher_key,
      voucher_no: voucher.voucher_no,
      voucher_type: voucher.voucher_type,
      voucher_date: voucher.voucher_date,
      ledger_name: readFirstTag(entry, ["LEDGERNAME"]),
      party_name: voucher.party_name,
      line_type: "inventory",
      amount,
      debit: debitFor(amount),
      credit: creditFor(amount),
      item_name: readFirstTag(entry, ["STOCKITEMNAME", "ITEMNAME"]),
      quantity: parseOptionalAmount(readFirstTag(entry, ["BILLEDQTY", "ACTUALQTY", "QTY"])),
      rate: parseOptionalAmount(readFirstTag(entry, ["RATE"])),
      gst_rate: parseOptionalAmount(readFirstTag(entry, ["GSTRATE", "RATEOFINVOICETAX"])),
      tax_amount: parseOptionalAmount(readFirstTag(entry, ["TAXAMOUNT"])),
      raw_payload: {
        raw_xml: entry.slice(0, 4000),
      },
    };
  });
}

function parseVouchers(
  xml: string,
  report: TallyReportKey,
  company: string,
  missingFields: Missing[]
) {
  const vouchers: CanonicalVoucher[] = [];
  const lines: CanonicalVoucherLine[] = [];
  const parties = new Map<string, CanonicalParty>();

  for (const block of readBlocks(xml, "VOUCHER")) {
    const voucherGuid = readFirstTag(block, ["GUID", "MASTERID", "ALTERID"]);
    const voucherNo = readFirstTag(block, ["VOUCHERNUMBER", "VOUCHERNO", "NUMBER"]);
    const voucherType =
      readAttr(block, "VCHTYPE") ||
      readFirstTag(block, ["VOUCHERTYPENAME", "VOUCHERTYPE", "VCHTYPE"]);
    const voucherDate = parseTallyDate(readFirstTag(block, ["DATE", "VOUCHERDATE"]));
    const partyName = readFirstTag(block, [
      "PARTYLEDGERNAME",
      "PARTYNAME",
      "BASICBUYERNAME",
      "BASICBASEPARTYNAME",
    ]);
    const reference = readFirstTag(block, ["REFERENCE", "REFERENCENO", "BILLREFERENCE"]);
    const narration = readFirstTag(block, ["NARRATION"]);
    const gstNo = readFirstTag(block, ["PARTYGSTIN", "GSTIN", "GSTREGISTRATIONNO", "GSTNO"]);
    const fallbackKey = [
      company,
      voucherType,
      voucherDate,
      voucherNo,
      partyName,
      reference,
      stableHash(block),
    ]
      .filter(Boolean)
      .join("|");
    const voucherKey = voucherGuid || stableHash(fallbackKey);

    const header = {
      company,
      voucher_key: voucherKey,
      voucher_no: voucherNo,
      voucher_type: voucherType,
      voucher_date: voucherDate,
      party_name: partyName,
    };
    const parsedLines = [
      ...parseLedgerEntries(block, header),
      ...parseInventoryEntries(block, header),
    ];
    const firstLine = parsedLines.find((line) => line.ledger_name);
    const directAmount = parseAmount(readFirstTag(block, ["AMOUNT"]));
    const amount = parsedLines.length
      ? parsedLines.reduce((sum, line) => sum + line.amount, 0)
      : directAmount;
    const debitTotal = parsedLines.length
      ? parsedLines.reduce((sum, line) => sum + line.debit, 0)
      : debitFor(amount);
    const creditTotal = parsedLines.length
      ? parsedLines.reduce((sum, line) => sum + line.credit, 0)
      : creditFor(amount);

    const voucher: CanonicalVoucher = {
      company,
      voucher_key: voucherKey,
      voucher_guid: voucherGuid,
      voucher_no: voucherNo,
      voucher_type: voucherType,
      voucher_date: voucherDate,
      party_name: partyName,
      ledger_name: firstLine?.ledger_name || partyName,
      reference,
      narration,
      gst_no: gstNo,
      amount,
      debit_total: debitTotal,
      credit_total: creditTotal,
      source_report: report,
      raw_payload: {
        raw_xml: block.slice(0, 8000),
        parser: "canonical_tly04_v1",
      },
    };

    const missingHeader = missing([
      ["voucher_date", voucher.voucher_date],
      ["voucher_type", voucher.voucher_type],
      ["voucher_no", voucher.voucher_no || voucher.voucher_guid],
      ["party_name", voucher.party_name || voucher.ledger_name],
    ]);
    if (missingHeader.length) {
      missingFields.push({
        entity: "voucher",
        key: voucher.voucher_key,
        fields: missingHeader,
      });
    }

    for (const line of parsedLines) {
      const missingLine = missing([
        ["ledger_name", line.ledger_name],
        ["amount", line.amount || line.debit || line.credit],
      ]);
      if (missingLine.length) {
        missingFields.push({
          entity: "line",
          key: `${voucher.voucher_key}:${lines.length}`,
          fields: missingLine,
        });
      }
    }

    vouchers.push(voucher);
    lines.push(...parsedLines);

    if (partyName) {
      const current = parties.get(partyName);
      const receivable = (voucherType || "").toLowerCase().includes("sales")
        ? Math.abs(amount)
        : 0;
      const payable = (voucherType || "").toLowerCase().includes("purchase")
        ? Math.abs(amount)
        : 0;
      parties.set(partyName, {
        company,
        party_name: partyName,
        party_type: current?.party_type || null,
        ledger_name: partyName,
        gst_no: current?.gst_no || gstNo,
        mobile: current?.mobile || null,
        email: current?.email || null,
        address: current?.address || null,
        opening_balance: current?.opening_balance || null,
        closing_balance: current?.closing_balance || null,
        receivable_total: (current?.receivable_total || 0) + receivable,
        payable_total: (current?.payable_total || 0) + payable,
        raw_payload: current?.raw_payload || { source: "voucher_party" },
      });
    }
  }

  return { vouchers, lines, parties: [...parties.values()] };
}

function parseLedgers(
  xml: string,
  company: string,
  missingFields: Missing[]
): CanonicalLedger[] {
  const ledgers: CanonicalLedger[] = [];
  const blocks = readBlocks(xml, "LEDGER");

  for (const block of blocks) {
    const name = readNameAttr(block) || readFirstTag(block, ["NAME", "LEDGERNAME"]);
    if (!name) {
      missingFields.push({
        entity: "ledger",
        key: stableHash(block),
        fields: ["ledger_name"],
      });
      continue;
    }

    const parent = readFirstTag(block, ["PARENT"]);
    const groupName = readFirstTag(block, ["GROUP", "GROUPNAME"]) || parent;
    const flags = classifyLedger(name, parent, groupName);
    const opening = parseOptionalAmount(readFirstTag(block, ["OPENINGBALANCE"]));
    const closing = parseOptionalAmount(readFirstTag(block, ["CLOSINGBALANCE"]));
    ledgers.push({
      company,
      ledger_name: name,
      parent,
      group_name: groupName,
      opening_balance: opening,
      closing_balance: closing,
      debit_total: closing && closing < 0 ? Math.abs(closing) : 0,
      credit_total: closing && closing > 0 ? closing : 0,
      gst_no: readFirstTag(block, ["GSTREGISTRATIONNO", "PARTYGSTIN", "GSTIN"]),
      is_bank: flags.is_bank,
      is_cash: flags.is_cash,
      is_party: flags.is_party,
      raw_payload: {
        raw_xml: block.slice(0, 4000),
        parser: "canonical_tly04_v1",
      },
    });
  }

  return ledgers;
}

function partiesFromLedgers(ledgers: CanonicalLedger[], company: string): CanonicalParty[] {
  return ledgers
    .filter((ledger) => ledger.is_party)
    .map((ledger) => ({
      company,
      party_name: ledger.ledger_name,
      party_type: ledger.group_name,
      ledger_name: ledger.ledger_name,
      gst_no: ledger.gst_no,
      mobile: null,
      email: null,
      address: null,
      opening_balance: ledger.opening_balance,
      closing_balance: ledger.closing_balance,
      receivable_total: ledger.closing_balance && ledger.closing_balance > 0 ? ledger.closing_balance : 0,
      payable_total: ledger.closing_balance && ledger.closing_balance < 0 ? Math.abs(ledger.closing_balance) : 0,
      raw_payload: ledger.raw_payload,
    }));
}

function uniqueParties(parties: CanonicalParty[]): CanonicalParty[] {
  const byName = new Map<string, CanonicalParty>();
  for (const party of parties) {
    const current = byName.get(party.party_name);
    byName.set(party.party_name, {
      ...party,
      party_type: current?.party_type || party.party_type,
      gst_no: current?.gst_no || party.gst_no,
      opening_balance: current?.opening_balance ?? party.opening_balance,
      closing_balance: current?.closing_balance ?? party.closing_balance,
      receivable_total: (current?.receivable_total || 0) + party.receivable_total,
      payable_total: (current?.payable_total || 0) + party.payable_total,
    });
  }
  return [...byName.values()];
}

export function parseCanonicalTallyXml(input: {
  xml: string;
  report: TallyReportKey;
  company: string;
  from: string;
  to: string;
}): ParsedTallyReport {
  const missingFields: Missing[] = [];
  const parsedVouchers = parseVouchers(
    input.xml,
    input.report,
    input.company,
    missingFields
  );
  const ledgers = parseLedgers(input.xml, input.company, missingFields);
  const parties = uniqueParties([
    ...parsedVouchers.parties,
    ...partiesFromLedgers(ledgers, input.company),
  ]);

  if (
    !parsedVouchers.vouchers.length &&
    !ledgers.length &&
    input.xml.trim().length > 0
  ) {
    missingFields.push({
      entity: "report",
      key: input.report,
      fields: ["structured_rows"],
    });
  }

  return {
    report: input.report,
    company: input.company,
    from: input.from,
    to: input.to,
    rawXml: input.xml,
    vouchers: parsedVouchers.vouchers,
    lines: parsedVouchers.lines,
    ledgers,
    parties,
    missingFieldCount: missingFields.reduce(
      (sum, item) => sum + item.fields.length,
      0
    ),
    missingFields,
  };
}
