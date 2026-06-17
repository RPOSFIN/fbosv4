/**
 * FBOS — ONE Tally Finance Sheet → Supabase  (v7.3 FINAL)
 *
 * === CHANGELOG v7.3 ===
 * TRIGGERS: ClickUp leads har 10 MINUTE + Finance→Supabase har 2 GHANTE
 * LOGS: ab Indian time (IST) me likhe jate hain
 *
 * === CHANGELOG v7 ===
 * NEW: Lead CRM ab SIMPLE 10 columns — Next Followup Date, Followup Count,
 *      Remark (latest ClickUp comment ka text, nahi to "remarks" custom field)
 *      Faltu columns (Followup Stage, Order Stage, Lead Source, Material Type) hata diye
 *
 * === CHANGELOG v6 ===
 * FIX 2: Due Date — raw timestamp (1781085600000) ab proper date banta hai;
 *        "Followup Attempt" jaise number fields ab galti se date nahi bante
 * FIX 3: FIN_COL.opening_balance add hua — "Opening Cash" formula ab sahi
 * FIX 4: Payable aging ab apna alag formula pata hai (pehla match = receivable,
 *        doosra match = payable) — ab dono sections sahi numbers dikhayenge
 * FIX 5: Revenue/Direct Cost — Tally Cr-negative handle + double counting hataya
 * FIX 6: Sheet → Supabase dates ab yyyy-MM-dd jate hain (GMT+0530 error khatam)
 * FIX 7: Sync ab DIN ME 1 BAAR (subah 8 baje) — 2 hours wala hata diya
 * FIX 8: doPost ab "records" YA "rows" dono accept karta hai (vendor-friendly)
 *
 * Run once:
 *   initializeFinanceSheet — ek hi tab 06_Finance_Sync + heads (DATA WIPE hota hai - sirf fresh setup pe!)
 *   setupDailyTriggers     — din me 1 baar sync (subah 8 baje)
 *   resumeFbosSetup        — safe re-run (koi data wipe nahi)
 */

var TAB_FINANCE = "06_Finance_Sync";
var TAB_STATUS = "00_Sync_Status";

var FINANCE_HEADERS = [
  "data_type", "company_name", "voucher_date", "voucher_no", "voucher_type",
  "party_name", "ledger_name", "parent_group", "description", "debit", "credit",
  "amount", "opening_balance", "closing_balance", "outstanding_amount", "bill_no",
  "bill_date", "due_date", "overdue_days", "bank_name", "account_no", "balance",
  "as_on_date", "gst_no", "reference", "narration", "synced_at",
];

function configSheetLookup(key) {
  try {
    var ssId =
      PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID") ||
      "1Pi6Mz7P5oYkLutsWLrM8aoos4ijXtmEuessFvd4oUBI";
    var sh = SpreadsheetApp.openById(ssId).getSheetByName("CONFIG");
    if (!sh) return "";
    var data = sh.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0] || "").trim() === key) {
        return String(data[i][1] || "").trim();
      }
    }
  } catch (e) {}
  return "";
}

function getProp(key, fallback) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  if (v) return String(v).trim();
  v = configSheetLookup(key);
  if (v) return v;
  if (key === "SPREADSHEET_ID") {
    return "1Pi6Mz7P5oYkLutsWLrM8aoos4ijXtmEuessFvd4oUBI";
  }
  if (key === "CLICKUP_LIST_ID") return "901615315973";
  if (key === "SUPABASE_URL") {
    return configSheetLookup("NEXT_PUBLIC_SUPABASE_URL") || fallback || "";
  }
  if (key === "SUPABASE_SERVICE_KEY") {
    return configSheetLookup("SUPABASE_SERVICE_ROLE_KEY") || fallback || "";
  }
  if (key === "SYNC_SECRET" || key === "SHEET_SYNC_SECRET") {
    var s = configSheetLookup("SHEET_SYNC_SECRET") || configSheetLookup("SYNC_SECRET");
    if (s) return s;
  }
  return fallback || "";
}

/** Copy CONFIG tab secrets → Script Properties (run once if properties UI blocked) */
function syncConfigToScriptProperties() {
  var map = {
    SUPABASE_URL: ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"],
    SUPABASE_SERVICE_KEY: ["SUPABASE_SERVICE_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
    SPREADSHEET_ID: ["SPREADSHEET_ID"],
    SHEET_SYNC_SECRET: ["SHEET_SYNC_SECRET", "SYNC_SECRET"],
    SYNC_SECRET: ["SYNC_SECRET", "SHEET_SYNC_SECRET"],
    CLICKUP_API_TOKEN: ["CLICKUP_API_TOKEN"],
    CLICKUP_LIST_ID: ["CLICKUP_LIST_ID"],
    GOOGLE_WEBAPP_URL: ["GOOGLE_WEBAPP_URL"],
  };
  var props = PropertiesService.getScriptProperties();
  var set = 0;
  Object.keys(map).forEach(function (canonical) {
    for (var i = 0; i < map[canonical].length; i++) {
      var v = configSheetLookup(map[canonical][i]);
      if (v) {
        props.setProperty(canonical, v);
        set++;
        break;
      }
    }
  });
  logSync("apps_script", "CONFIG", set, "ok", "Synced CONFIG → Script Properties");
  return set;
}

function getSpreadsheet() {
  var id = getProp("SPREADSHEET_ID");
  if (id) return SpreadsheetApp.openById(id);
  return SpreadsheetApp.getActiveSpreadsheet();
}

function logSync(source, tab, rows, status, message) {
  try {
    var sh = getSpreadsheet().getSheetByName(TAB_STATUS);
    if (!sh) return;
    sh.appendRow([
      Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss"),
      source, tab, rows, status, message || "",
    ]);
  } catch (e) {}
}

/** STEP 1 — Sirf finance tab + sync log. WARNING: TAB CLEAR hota hai! Data hone par mat chalana. */
function initializeFinanceSheet() {
  var ss = getSpreadsheet();
  var defs = [
    { name: TAB_STATUS, headers: ["sync_time", "source", "tab", "rows", "status", "message"] },
    { name: TAB_FINANCE, headers: FINANCE_HEADERS },
  ];
  defs.forEach(function (def) {
    var sh = ss.getSheetByName(def.name);
    if (!sh) sh = ss.insertSheet(def.name);
    sh.clear();
    sh.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, def.headers.length)
      .setFontWeight("bold")
      .setBackground("#1e293b")
      .setFontColor("#e2e8f0");
    sh.autoResizeColumns(1, def.headers.length);
  });
  logSync("apps_script", TAB_FINANCE, 0, "ok", "Finance master sheet ready (one tab for all Tally data)");
}

/** Backward compatible name */
function initializeFbosMasterSheet() {
  initializeFinanceSheet();
}

function sheetByName(name) {
  var sh = getSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error("Tab missing: " + name + " — run initializeFinanceSheet");
  return sh;
}

/** FIX 6: Date cells → yyyy-MM-dd (warna Supabase "GMT+0530" string reject karta hai) */
function cellToCleanString_(val) {
  if (val == null || val === "") return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(val).trim();
}

function rowsFromFinanceSheet() {
  var sh = sheetByName(TAB_FINANCE);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(function (h) {
    return String(h || "").trim().toLowerCase().replace(/\s+/g, "_");
  });
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var obj = {};
    var empty = true;
    for (var c = 0; c < headers.length; c++) {
      var val = values[r][c];
      if (val !== "" && val != null) empty = false;
      obj[headers[c]] = cellToCleanString_(val); // FIX 6
    }
    if (!empty) rows.push(obj);
  }
  return rows;
}

function supabaseRequest(method, path, body, extraHeaders) {
  var url = getProp("SUPABASE_URL").replace(/\/$/, "") + "/rest/v1/" + path;
  var key = getProp("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_KEY");
  var headers = {
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  if (extraHeaders) {
    for (var k in extraHeaders) headers[k] = extraHeaders[k];
  }
  var opts = { method: method, muteHttpExceptions: true, headers: headers };
  if (body) opts.payload = JSON.stringify(body);
  return UrlFetchApp.fetch(url, opts);
}

/** FIX 6: date strings ko yyyy-MM-dd me hi bhejo; galat ho to null */
function toIsoDateOrNull_(s) {
  if (!s) return null;
  var str = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  var d = new Date(str);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return null;
}

function rowToFinancePayload(row) {
  var debit = parseFloat(row.debit) || 0;
  var credit = parseFloat(row.credit) || 0;
  var amount =
    parseFloat(row.amount) ||
    parseFloat(row.outstanding_amount) ||
    parseFloat(row.balance) ||
    parseFloat(row.closing_balance) ||
    Math.max(debit, credit) ||
    0;
  var desc =
    row.description || row.narration || row.ledger_name || row.party_name || row.bill_no || "";
  if (!desc && !amount) return null;
  return {
    company: row.company_name || "Flexiflair Tech Private Limited",
    record_type: row.data_type || row.record_type || "ledger",
    description: desc,
    amount: amount,
    voucher_date: toIsoDateOrNull_(row.voucher_date || row.bill_date || row.as_on_date), // FIX 6
    voucher_no: row.voucher_no || row.bill_no || null,
    voucher_type: row.voucher_type || row.data_type || null,
    ledger_name: row.ledger_name || null,
    party_name: row.party_name || null,
    debit: debit,
    credit: credit,
    reference: row.reference || null,
    narration: row.narration || null,
    gst_no: row.gst_no || null,
    status: "queued",
    source: "tally",
  };
}

/** Sheet → Supabase (pehle purane tally rows delete, phir naye insert) */
function syncFinanceToSupabase() {
  var rows = rowsFromFinanceSheet();
  supabaseRequest("DELETE", "finance_import_queue?source=eq.tally", null, {
    Prefer: "return=minimal",
  });
  var batch = [];
  rows.forEach(function (row) {
    var p = rowToFinancePayload(row);
    if (p) batch.push(p);
  });
  if (!batch.length) {
    logSync("apps_script", TAB_FINANCE, 0, "ok", "No finance rows");
    return 0;
  }
  var res = supabaseRequest("POST", "finance_import_queue", batch);
  if (res.getResponseCode() >= 300) throw new Error(res.getContentText());
  logSync("apps_script", TAB_FINANCE, batch.length, "ok", "Supabase finance synced");
  return batch.length;
}

/** Daily sync — sirf finance (Phase 1) */
function syncAllToSupabase() {
  var n = 0;
  try {
    n = syncFinanceToSupabase();
  } catch (e) {
    logSync("apps_script", TAB_FINANCE, 0, "error", String(e));
  }
  var webhook = getProp("FBOS_WEBHOOK_URL");
  var secret = getProp("SYNC_SECRET") || getProp("SHEET_SYNC_SECRET");
  if (webhook && secret) {
    try {
      UrlFetchApp.fetch(webhook, {
        method: "post",
        headers: { Authorization: "Bearer " + secret },
        muteHttpExceptions: true,
      });
    } catch (e2) {}
  }
  return "finance:" + n;
}

/** Daily — finance + ClickUp leads */
function syncAllHub() {
  var leadN = 0;
  try {
    leadN = syncClickUpToLeadCrm();
  } catch (e) {
    logSync("clickup", TAB_LEADS, 0, "error", String(e));
  }
  var fin = syncAllToSupabase();
  return { leads: leadN, finance: fin };
}

/** v7.3 FINAL: ClickUp har 10 min + Finance har 2 ghante */
function setupDailyTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    ScriptApp.deleteTrigger(t);
  });
  // ClickUp leads — har 10 minute
  ScriptApp.newTrigger("syncClickUpToLeadCrm").timeBased().everyMinutes(10).create();
  // Finance → Supabase — har 2 ghante
  ScriptApp.newTrigger("syncAllToSupabase").timeBased().everyHours(2).create();
  logSync("apps_script", "TRIGGERS", 2, "ok", "ClickUp every 10 min + finance every 2 hours");
}

/** Backward compatible — ab yeh bhi DAILY hi banata hai (2h nahi) */
function setupEvery2HourTriggers() {
  setupDailyTriggers();
}

function replaceFinanceSheetRows(records) {
  var sh = sheetByName(TAB_FINANCE);
  var last = sh.getLastRow();
  if (last > 1) sh.deleteRows(2, last - 1);
  if (!records || !records.length) return 0;
  var now = new Date().toISOString();
  var matrix = records.map(function (rec) {
    rec.synced_at = rec.synced_at || now;
    if (!rec.data_type && rec.record_type) rec.data_type = rec.record_type;
    return FINANCE_HEADERS.map(function (h) {
      return rec[h] != null ? rec[h] : "";
    });
  });
  sh.getRange(2, 1, matrix.length, FINANCE_HEADERS.length).setValues(matrix);
  return records.length;
}

/** Tally cloud script POST — poora data ek hi tab mein replace. FIX 8: records|rows dono OK */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || "{}");
    if (
      body.action === "tally_finance" ||
      body.action === "tally_finance_sync" ||
      body.action === "tally_vouchers"
    ) {
      var records = body.records || body.rows || []; // FIX 8
      var n = replaceFinanceSheetRows(records);
      var imported = syncFinanceToSupabase();
      return jsonOut({ ok: true, tab: TAB_FINANCE, sheet_rows: n, supabase_rows: imported });
    }
    return jsonOut({ ok: false, message: "Use action tally_finance with records[]" });
  } catch (err) {
    return jsonOut({ ok: false, message: String(err) });
  }
}

function doGet(e) {
  var p = e && e.parameter ? e.parameter : {};
  if (p.action && p.secret) {
    var expected = getProp("SYNC_SECRET") || getProp("SHEET_SYNC_SECRET");
    if (!expected || String(p.secret) !== String(expected)) {
      return jsonOut({ ok: false, message: "invalid secret" });
    }
    if (p.action === "resume") {
      return jsonOut({ ok: true, result: resumeFbosSetup() });
    }
    if (p.action === "sync_clickup") {
      return jsonOut({ ok: true, rows: syncClickUpToLeadCrm() });
    }
    if (p.action === "setup_finance") {
      return jsonOut({ ok: true, result: setupSingleSheetFinance() });
    }
    if (p.action === "sync_config") {
      return jsonOut({ ok: true, synced: syncConfigToScriptProperties() });
    }
    if (p.action === "sync_supabase") {
      return jsonOut({ ok: true, rows: syncFinanceToSupabase() });
    }
    return jsonOut({ ok: false, message: "unknown action" });
  }
  return jsonOut({
    ok: true,
    service: "FBOS Finance Hub v6",
    tab: TAB_FINANCE,
    sync: "daily 8am",
    remote: "?action=resume|sync_clickup|setup_finance|sync_config|sync_supabase&secret=...",
  });
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/** 06_Finance_Sync column refs for dashboard formulas. FIX 3: opening_balance added */
var FIN_COL = {
  data_type: "A",
  voucher_type: "E",
  party_name: "F",
  parent_group: "H",
  debit: "J",
  credit: "K",
  amount: "L",
  opening_balance: "M", // FIX 3
  closing_balance: "N",
  outstanding_amount: "O",
  bill_date: "Q",
  due_date: "R",
  overdue_days: "S",
  balance: "V",
};

function finRange(col) {
  return "'" + TAB_FINANCE + "'!" + col + ":" + col;
}

function finSumif(type, col) {
  return "SUMIF(" + finRange(FIN_COL.data_type) + ',"' + type + '",' + finRange(col) + ")";
}

function finSumifs(sumCol, filters) {
  var parts = [finRange(sumCol), finRange(FIN_COL.data_type), '"voucher"'];
  filters.forEach(function (f) {
    parts.push(finRange(f.col));
    parts.push('"' + f.crit + '"');
  });
  return "SUMIFS(" + parts.join(",") + ")";
}

/** CONFIG keys for fund targets (optional manual targets) */
function ensureConfigFinanceKeys() {
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName("CONFIG");
  if (!sh) return;
  var keys = [
    ["EMERGENCY_FUND_TARGET", 500000, "Min cash buffer (INR)"],
    ["RESERVE_FUND_TARGET", 1000000, "Reserve cash target (INR)"],
    ["MONTHLY_FIXED_OVERHEAD", 0, "Operating expenses override (INR)"],
  ];
  var existing = {};
  var last = Math.max(sh.getLastRow(), 1);
  var vals = sh.getRange(1, 1, last, 3).getValues();
  vals.forEach(function (row) {
    if (row[0]) existing[String(row[0]).trim()] = true;
  });
  keys.forEach(function (k) {
    if (!existing[k[0]]) sh.appendRow(k);
  });
}

function configLookup(key) {
  return 'IFERROR(INDEX(CONFIG!B:B,MATCH("' + key + '",CONFIG!A:A,0)),0)';
}

/** Aging formula builder — receivable YA payable (FIX 4) */
function agingFormula_(dtype, min, max) {
  var R = finRange;
  var dt = FIN_COL;
  var f =
    "SUMIFS(" + R(dt.outstanding_amount) + "," +
    R(dt.data_type) + ',"' + dtype + '",' +
    R(dt.overdue_days) + ',">=' + min + '"';
  if (max) f += "," + R(dt.overdue_days) + ',"<=' + max + '"';
  f += ")";
  if (min === 0) {
    // not-yet-due bhi 0-30 bucket me
    f +=
      "+SUMIFS(" + R(dt.outstanding_amount) + "," +
      R(dt.data_type) + ',"' + dtype + '",' +
      R(dt.overdue_days) + ',"<=0")';
  }
  return "=" + f;
}

/** All finance KPI formulas sourced from 06_Finance_Sync (Tally import) */
function financeDashboardFormulas_() {
  var R = finRange;
  var dt = FIN_COL;

  var bankCash = finSumif("bank_cash", dt.balance);
  var receivable = finSumif("receivable", dt.outstanding_amount);
  var payable = finSumif("payable", dt.outstanding_amount);

  // FIX 5: Sales = sirf vouchers (double counting hataya)
  var salesVouchers =
    "SUMIFS(" + R(dt.amount) + "," + R(dt.data_type) + ',"voucher",' +
    R(dt.voucher_type) + ',"*Sales*")';

  var expenses =
    finSumifs(dt.debit, [{ col: dt.parent_group, crit: "*Expenses*" }]) +
    "+SUMIFS(" + R(dt.debit) + "," + R(dt.data_type) + ',"voucher",' +
    R(dt.parent_group) + ',"*Direct*")+' +
    configLookup("MONTHLY_FIXED_OVERHEAD");

  var collections =
    "SUMIFS(" + R(dt.credit) + "," + R(dt.data_type) + ',"voucher",' +
    R(dt.voucher_type) + ',"*Receipt*")+SUMIFS(' +
    R(dt.credit) + "," + R(dt.data_type) + ',"voucher",' +
    R(dt.voucher_type) + ',"*Collection*")';

  var overdueAmt =
    "SUMIFS(" + R(dt.outstanding_amount) + "," + R(dt.data_type) +
    ',"receivable",' + R(dt.overdue_days) + ',">0")';

  var overdueParties =
    "IFERROR(ROWS(UNIQUE(FILTER(" + R(dt.party_name) + "," +
    R(dt.data_type) + '="receivable",' + R(dt.overdue_days) + ">0," +
    R(dt.outstanding_amount) + ">0))),0)";

  var badDebts =
    "SUMIFS(" + R(dt.outstanding_amount) + "," + R(dt.data_type) +
    ',"receivable",' + R(dt.parent_group) + ',"*Bad Debt*")+SUMIFS(' +
    R(dt.closing_balance) + "," + R(dt.data_type) + ',"ledger",' +
    R(dt.parent_group) + ',"*Bad Debt*")';

  var emergencyFund = "MAX(0," + bankCash + "-" + configLookup("EMERGENCY_FUND_TARGET") + ")";
  var reserveFund =
    "MAX(0," + bankCash + "-" + configLookup("EMERGENCY_FUND_TARGET") + "-" +
    configLookup("RESERVE_FUND_TARGET") + ")";

  var bankRecon = "IF(" + bankCash + '>0,"Synced from Tally","Awaiting bank sync")';
  var salePurchaseRecon =
    "IFERROR(ABS(" + receivable + "+" + collections + "-" + salesVouchers + '),"")';

  // FIX 5: Revenue — ledger me Tally Cr negative hota hai → ABS;
  // ledger ho to wahi use karo, warna vouchers (dono kabhi add mat karo)
  var revenueLedger =
    "ABS(SUMIFS(" + R(dt.closing_balance) + "," + R(dt.data_type) +
    ',"ledger",' + R(dt.parent_group) + ',"*Sales Account*"))';
  var revenue = "IF(" + revenueLedger + ">0," + revenueLedger + "," + salesVouchers + ")";

  var directLedger =
    "ABS(SUMIFS(" + R(dt.closing_balance) + "," + R(dt.data_type) +
    ',"ledger",' + R(dt.parent_group) + ',"*Direct Expenses*"))';
  var directVouchers =
    "SUMIFS(" + R(dt.debit) + "," + R(dt.data_type) + ',"voucher",' +
    R(dt.parent_group) + ',"*Direct*")';
  var directCost = "IF(" + directLedger + ">0," + directLedger + "," + directVouchers + ")";

  var payments =
    "SUMIFS(" + R(dt.debit) + "," + R(dt.data_type) + ',"voucher",' +
    R(dt.voucher_type) + ',"*Payment*")+SUMIFS(' +
    R(dt.debit) + "," + R(dt.data_type) + ',"voucher",' +
    R(dt.voucher_type) + ',"*Paid*")';

  var openingCash =
    "SUMIFS(" + R(dt.opening_balance) + "," + R(dt.data_type) + ',"bank_cash")';

  return {
    Receivable: "=" + receivable,
    Payable: "=" + payable,
    "Free Cash": "=" + bankCash,
    Sales: "=" + salesVouchers,
    Expenses: "=" + expenses,
    Collections: "=" + collections,
    "Overdue Amount": "=" + overdueAmt,
    "Overdue Parties": "=" + overdueParties,
    "Overdue Collections": "=" + overdueAmt,
    "Bad Debts": "=" + badDebts,
    "Emergency Fund": "=" + emergencyFund,
    "Reserve Fund": "=" + reserveFund,
    "BANK RECONCILIATION": "=" + bankRecon,
    "SALE PURCHASE RECONCILIATION": "=" + salePurchaseRecon,
    RECEIVABLE: "=" + receivable,
    PAYABLE: "=" + payable,
    EXPENSES: "=" + expenses,
    COLLECTIONS: "=" + collections,
    Revenue: "=" + revenue,
    "Direct Cost": "=" + directCost,
    "Gross Profit": "=IFERROR(" + revenue + "-" + directCost + ',"")',
    "Gross Profit %":
      "=IFERROR(IF(" + revenue + ">0,(" + revenue + "-" + directCost + ")/" +
      revenue + ',""),"")',
    "Operating Expenses": "=" + expenses,
    EBITDA: "=IFERROR((" + revenue + "-" + directCost + ")-(" + expenses + '),"")',
    Payments: "=" + payments,
    "Net Cash Flow": "=IFERROR(" + collections + "-" + payments + ',"")',
    "Opening Cash": "=" + openingCash,
    "Closing Cash": "=" + bankCash,
    "Collection Trend":
      "=IFERROR(COUNTIFS(" + R(dt.data_type) + ',"voucher",' +
      R(dt.voucher_type) + ',"*Receipt*"),0)',
    "Receivable Trend": "=" + receivable,
    "PAYABLE TREND": "=" + payable,
    "PROFIT TREND": "=IFERROR((" + revenue + "-" + directCost + ")-(" + expenses + '),"")',
    // NOTE: aging labels yahan NAHI — woh applyAgingBothSections_ se lagte hain (FIX 4)
  };
}

/**
 * FIX 4: "0-30 Days" jaise labels dashboard me 2 jagah hain —
 * pehla (upar wala) = RECEIVABLE aging, doosra (neeche wala) = PAYABLE aging.
 */
function applyAgingBothSections_(dash) {
  var buckets = [
    ["0-30 Days", 0, 30],
    ["31-60 Days", 31, 60],
    ["61-90 Days", 61, 90],
    ["90+ Days", 91, null],
  ];
  var done = [];
  buckets.forEach(function (b) {
    var matches = dash
      .createTextFinder(b[0])
      .matchEntireCell(true)
      .matchCase(false)
      .findAll();
    if (matches.length > 0) {
      dash
        .getRange(matches[0].getRow(), matches[0].getColumn() + 1)
        .setFormula(agingFormula_("receivable", b[1], b[2]));
      done.push(b[0] + ":recv");
    }
    if (matches.length > 1) {
      dash
        .getRange(matches[1].getRow(), matches[1].getColumn() + 1)
        .setFormula(agingFormula_("payable", b[1], b[2]));
      done.push(b[0] + ":pay");
    }
  });
  return done;
}

/** Find label on dashboard and set formula one column to the right (all exact matches) */
function applyFormulaByLabel(sheet, label, formula, aliases) {
  var tries = [String(label)];
  if (aliases && aliases.length) tries = tries.concat(aliases);
  for (var i = 0; i < tries.length; i++) {
    var finder = sheet
      .createTextFinder(String(tries[i]))
      .matchEntireCell(true)
      .matchCase(false);
    var cell = finder.findNext();
    if (cell) {
      do {
        sheet.getRange(cell.getRow(), cell.getColumn() + 1).setFormula(formula);
        cell = finder.findNext();
      } while (cell);
      return true;
    }
  }
  // Safe normalized exact match only (NO partial/substring — that overwrites wrong cells)
  var want = normalizeDashLabel(label);
  var aliasNorm = (aliases || []).map(normalizeDashLabel);
  var data = sheet.getDataRange().getDisplayValues();
  for (var r = 0; r < data.length; r++) {
    for (var c = 0; c < data[r].length; c++) {
      var cellText = normalizeDashLabel(data[r][c]);
      if (!cellText) continue;
      if (cellText === want || aliasNorm.indexOf(cellText) >= 0) {
        sheet.getRange(r + 1, c + 2).setFormula(formula);
        return true;
      }
    }
  }
  return false;
}

function normalizeDashLabel(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

var FINANCE_LABEL_ALIASES = {
  "BANK RECONCILIATION": [
    "Bank Reconciliation", "Bank recon", "BANK RECON",
    "Bank Reconcilation", "Bank Reconcillation", "Bank Recon",
  ],
  "SALE PURCHASE RECONCILIATION": [
    "Sale Purchase Reconciliation", "Sale-Purchase Reconciliation",
    "SALE PURCHASE RECON", "Sales Purchase Reconciliation", "Sale Purchase Recon",
  ],
  "Gross Profit": ["GROSS PROFIT", "Gross profit"],
  "Gross Profit %": ["Gross Profit Percent", "GROSS PROFIT %", "Gross profit %", "Gross Profit Pct"],
  "Operating Expenses": [
    "OPERATING EXPENSES", "Operating expenses", "Op Expenses", "Opex",
    "Operating Expense", "EXPENSES",
  ],
  "Bad Debts": ["BAD DEBTS", "Bad debts", "Bad Debt"],
  "Overdue Amount": ["OVERDUE AMOUNT", "Overdue amount"],
  "Overdue Parties": ["OVERDUE PARTIES", "Overdue parties"],
  Payments: ["PAYMENTS", "Payment", "Total Payments", "Cash Payments"],
  "Net Cash Flow": [
    "NET CASH FLOW", "Net cash flow", "Net Cashflow", "Net Cash Flow ",
    "Cash Flow", "├─ Cash Flow", "CASH FLOW",
  ],
  "Opening Cash": ["OPENING CASH", "Opening cash", "Opening Cash Balance", "Cash Opening"],
  "Closing Cash": ["CLOSING CASH", "Closing cash", "Closing Cash Balance", "Cash Closing"],
};

/** Legacy 06A formulas in FINANCE col E without row labels (R3/R5) */
var LEGACY_FINANCE_CELL_MAP = {
  "3,5": "Receivable",
  "5,5": "Overdue Amount",
};

var SALES_LABEL_ALIASES = {
  "Total Leads": ["TOTAL LEADS", "Leads Total", "Leads", "Total Lead"],
  "Today's Followups": ["Todays Followups", "Today Followups", "Today's Follow-up"],
  "Pending Followups": ["Pending Follow-up", "Pending Follow ups"],
  "Dormant Leads": ["DORMANT LEADS", "Dormant Lead", "Inactive Leads"],
  "Leads by Source": ["Lead by Source", "Leads By Source", "Lead Source Count", "Lead Source"],
  "Leads by Material Type": ["Lead by Material Type", "Material Type Count", "Material Type"],
  "NOT YET STARTED": ["Not Yet Started", "NOT YET START", "New Leads", "Not Started"],
  "Pending Quotations": ["Pending Quotation", "Quotations Pending"],
  "Total Order": ["Total Orders", "TOTAL ORDER"],
  "Order Conversion %": ["Order Conversion", "Conversion %"],
};

/**
 * STEP — Wire 01_Dashboard FINANCE (+ P&L / Cash / WC) to 06_Finance_Sync
 */
function setupFinanceDashboardFormulas() {
  var ss = getSpreadsheet();
  var dash = ss.getSheetByName("01_Dashboard");
  if (!dash) throw new Error("01_Dashboard tab missing");
  ensureConfigFinanceKeys();
  var formulas = financeDashboardFormulas_();
  var applied = [];
  var missed = [];
  Object.keys(formulas).forEach(function (label) {
    if (applyFormulaByLabel(dash, label, formulas[label], FINANCE_LABEL_ALIASES[label] || [])) {
      applied.push(label);
    } else {
      missed.push(label);
    }
  });
  // FIX 4: aging alag se — receivable + payable dono sections sahi
  var aging = applyAgingBothSections_(dash);
  applied = applied.concat(aging);
  logSync(
    "apps_script", "01_Dashboard", applied.length,
    missed.length ? "partial" : "ok",
    "Finance formulas: " + applied.length + " set; missed: " +
      (missed.length ? missed.join(", ") : "none")
  );
  return { applied: applied, missed: missed };
}

var LEGACY_FINANCE_TABS = ["06A_Receivable", "06B_Payable", "06C_Collections", "06_Finance"];

function formulaUsesLegacyFinanceTab(formula) {
  if (!formula) return false;
  var f = String(formula);
  if (f.indexOf("06_Finance_Sync") >= 0) return false;
  for (var i = 0; i < LEGACY_FINANCE_TABS.length; i++) {
    if (f.indexOf(LEGACY_FINANCE_TABS[i]) >= 0) return true;
  }
  if (/06_Finance[^_S]/.test(f) || /'06_Finance'!/.test(f)) return true;
  return false;
}

/** Scan dashboard — replace any 06A/06B/06C/06_Finance formulas with 06_Finance_Sync KPIs */
function replaceLegacyFinanceFormulasOnDashboard() {
  var ss = getSpreadsheet();
  var dash = ss.getSheetByName("01_Dashboard");
  if (!dash) throw new Error("01_Dashboard tab missing");
  var formulaMap = financeDashboardFormulas_();
  var range = dash.getDataRange();
  var formulas = range.getFormulas();
  var values = range.getValues();
  var replaced = [];
  var unresolved = [];
  for (var r = 0; r < formulas.length; r++) {
    for (var c = 0; c < formulas[r].length; c++) {
      if (!formulaUsesLegacyFinanceTab(formulas[r][c])) continue;
      var label =
        (c > 0 ? String(values[r][c - 1] || "").trim() : "") ||
        (c > 1 ? String(values[r][c - 2] || "").trim() : "");
      var newFormula = lookupFinanceFormula(formulaMap, label);
      if (!newFormula) {
        var cellKey = String(r + 1) + "," + String(c + 1);
        var mappedLabel = LEGACY_FINANCE_CELL_MAP[cellKey];
        if (mappedLabel) newFormula = formulaMap[mappedLabel];
      }
      if (newFormula) {
        dash.getRange(r + 1, c + 1).setFormula(newFormula);
        replaced.push(label || "R" + (r + 1) + "C" + (c + 1));
      } else {
        unresolved.push({ row: r + 1, col: c + 1, label: label, was: formulas[r][c] });
      }
    }
  }
  logSync(
    "apps_script", "01_Dashboard", replaced.length,
    unresolved.length ? "partial" : "ok",
    "Legacy finance refs replaced: " + replaced.length + ", unresolved: " + unresolved.length
  );
  return { replaced: replaced, unresolved: unresolved };
}

/** Hide old finance tabs — data ab sirf 06_Finance_Sync se */
function hideLegacyFinanceTabs() {
  var ss = getSpreadsheet();
  var hidden = [];
  LEGACY_FINANCE_TABS.forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (sh && !sh.isSheetHidden()) {
      sh.hideSheet();
      hidden.push(name);
    }
  });
  return hidden;
}

/** Restore P&L label cells that an earlier aggressive matcher overwrote with values. */
function repairPnLLabels() {
  var dash = getSpreadsheet().getSheetByName("01_Dashboard");
  if (!dash) return [];
  var fixes = [
    [20, 4, "Gross Profit"],
    [21, 4, "Gross Profit %"],
  ];
  var restored = [];
  fixes.forEach(function (f) {
    var cell = dash.getRange(f[0], f[1]);
    var v = String(cell.getDisplayValue()).trim();
    if (v === "" || /^-?\d+(\.\d+)?$/.test(v)) {
      cell.setValue(f[2]);
      restored.push(f[2]);
    }
  });
  return restored;
}

/** Place finance row labels that the dashboard template omits (value col = label col + 1) */
function ensureDashboardFinanceLabels() {
  var dash = getSpreadsheet().getSheetByName("01_Dashboard");
  if (!dash) return [];
  var placements = [
    [31, 4, "Opening Cash"],
    [32, 4, "Closing Cash"],
    [47, 4, "Payments"],
    [48, 4, "BANK RECONCILIATION"],
  ];
  var added = [];
  placements.forEach(function (p) {
    var cell = dash.getRange(p[0], p[1]);
    var v = String(cell.getDisplayValue()).trim();
    if (v === "" || /^-?\d+(\.\d+)?$/.test(v)) {
      cell.setValue(p[2]);
      added.push(p[2]);
    }
  });
  return added;
}

/** Place sales row labels missing from the top KPI grid */
function ensureDashboardSalesLabels() {
  var dash = getSpreadsheet().getSheetByName("01_Dashboard");
  if (!dash) return [];
  var placements = [
    [15, 1, "Total Leads"],
    [16, 1, "Dormant Leads"],
    [17, 1, "NOT YET STARTED"],
  ];
  var added = [];
  placements.forEach(function (p) {
    var cell = dash.getRange(p[0], p[1]);
    var v = String(cell.getDisplayValue()).trim();
    if (v === "" || /^-?\d+(\.\d+)?$/.test(v) || v === "0") {
      cell.setValue(p[2]);
      added.push(p[2]);
    }
  });
  return added;
}

function lookupFinanceFormula(formulaMap, label) {
  if (!label) return "";
  if (formulaMap[label]) return formulaMap[label];
  var up = String(label).toUpperCase();
  if (formulaMap[up]) return formulaMap[up];
  var norm = normalizeDashLabel(label);
  var keys = Object.keys(formulaMap);
  for (var i = 0; i < keys.length; i++) {
    if (normalizeDashLabel(keys[i]) === norm) return formulaMap[keys[i]];
    var aliases = FINANCE_LABEL_ALIASES[keys[i]] || [];
    for (var j = 0; j < aliases.length; j++) {
      if (normalizeDashLabel(aliases[j]) === norm) return formulaMap[keys[i]];
    }
  }
  return "";
}

/**
 * ONE-SHEET finance setup:
 * 0) Repair labels  1) Dashboard formulas  2) Replace legacy refs  3) Hide legacy tabs
 */
function setupSingleSheetFinance() {
  ensureConfigFinanceKeys();
  var repaired = repairPnLLabels();
  var financeLabels = ensureDashboardFinanceLabels();
  var step1 = setupFinanceDashboardFormulas();
  var step2 = replaceLegacyFinanceFormulasOnDashboard();
  var step3 = hideLegacyFinanceTabs();
  return {
    labelsRepaired: repaired,
    financeLabelsAdded: financeLabels,
    formulasApplied: step1.applied.length,
    formulasMissed: step1.missed,
    legacyReplaced: step2.replaced.length,
    legacyUnresolved: step2.unresolved,
    tabsHidden: step3,
  };
}

/** Unified Order Master — add missing Artwork/Cylinder columns (no data wipe) */
var TAB_ORDER = "02_Order_Master";
var ORDER_UNIFIED_HEADERS = [
  "Order ID", "Client Name", "Brand Name", "Product Category", "SKU",
  "Order Type", "Order Date", "Sales Owner", "Quotation Status", "Quotation Date",
  "PI Status", "PI Date", "Advance Status", "Advance Amount", "Artwork Status",
  "Artwork Approval Date", "Cylinder Status", "Printing Approval", "Printing Status",
  "Dispatch Status", "Cylinder Location", "Production Status", "Dispatch Date",
  "Balance Payment Status", "Outstanding Amount", "Responsible Person",
  "Price Difference", "Recommended Vendor", "Actual Vendor", "Next Action",
  "Next Action Date", "Last Price", "Current Price", "Target Dispatch Date",
  "Days Delayed", "Priority", "process stage", "Current Status", "Pending Where",
  "Blocked By", "Remarks", "Artwork ID", "Approved By", "Approval Mode",
  "Artwork File Link", "Cylinder ID", "Cylinder Vendor", "Last Used Date",
  "Cylinder Cost", "No Of Colors", "Reusable",
];

var LEGACY_OPS_TABS = ["03_Cylinder_Master", "04_Artwork_Master"];

function extendOrderMasterUnifiedHeaders() {
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName(TAB_ORDER);
  if (!sh) throw new Error(TAB_ORDER + " tab missing");
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var existing = sh
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map(function (h) { return String(h || "").trim(); })
    .filter(function (h) { return h.length > 0; });
  var added = [];
  ORDER_UNIFIED_HEADERS.forEach(function (header) {
    if (existing.indexOf(header) >= 0) return;
    existing.push(header);
    sh.getRange(1, existing.length).setValue(header);
    added.push(header);
  });
  if (added.length) {
    sh.getRange(1, 1, 1, existing.length)
      .setFontWeight("bold")
      .setBackground("#1e293b")
      .setFontColor("#e2e8f0");
    sh.setFrozenRows(1);
  }
  logSync("apps_script", TAB_ORDER, added.length, "ok",
    "Unified order headers added: " + added.join(", "));
  return { existing: existing.length, added: added };
}

function hideLegacyOpsMasterTabs() {
  var ss = getSpreadsheet();
  var hidden = [];
  LEGACY_OPS_TABS.forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (sh && !sh.isSheetHidden()) {
      sh.hideSheet();
      hidden.push(name);
    }
  });
  return hidden;
}

/** Order + Artwork + Cylinder → one tab. Does NOT hide legacy tabs until data migrated. */
function setupUnifiedOrderMaster() {
  var ext = extendOrderMasterUnifiedHeaders();
  return { headers: ext, note: "Source input TBD — structure only" };
}

/** ===================== ClickUp → 07_Lead_CRM ===================== */
/** v7: SIMPLE 10 columns — Next Followup Date + Followup Count + Remark (comment text) */
var TAB_LEADS = "07_Lead_CRM";
var LEAD_CRM_HEADERS = [
  "Lead ID", "Client Name", "Contact No", "Lead Status", "Assigned To",
  "Priority", "Next Followup Date", "Followup Count", "Start Date", "Remark",
];

function initializeLeadCrmSheet() {
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName(TAB_LEADS);
  if (!sh) sh = ss.insertSheet(TAB_LEADS);
  if (sh.getLastRow() > 1) {
    return extendLeadCrmMinimalHeaders();
  }
  sh.clear();
  sh.getRange(1, 1, 1, LEAD_CRM_HEADERS.length).setValues([LEAD_CRM_HEADERS]);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, LEAD_CRM_HEADERS.length)
    .setFontWeight("bold")
    .setBackground("#1e293b")
    .setFontColor("#e2e8f0");
  logSync("apps_script", TAB_LEADS, 0, "ok", "ClickUp lead CRM ready (15 cols)");
  return LEAD_CRM_HEADERS.length;
}

/** Update row-1 headers only — existing lead rows preserved */
function extendLeadCrmMinimalHeaders() {
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName(TAB_LEADS);
  if (!sh) return initializeLeadCrmSheet();
  var width = Math.max(sh.getLastColumn(), LEAD_CRM_HEADERS.length);
  var row1 = sh.getRange(1, 1, 1, width).getValues()[0];
  LEAD_CRM_HEADERS.forEach(function (h, i) {
    if (String(row1[i] || "").trim() !== h) {
      sh.getRange(1, i + 1).setValue(h);
    }
  });
  // v7: purane extra headers (col 11+: Followup Stage, Order Stage, Lead Source...) saaf karo
  if (width > LEAD_CRM_HEADERS.length) {
    sh.getRange(1, LEAD_CRM_HEADERS.length + 1, sh.getMaxRows() > 1 ? sh.getLastRow() : 1, width - LEAD_CRM_HEADERS.length).clearContent();
  }
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, LEAD_CRM_HEADERS.length)
    .setFontWeight("bold")
    .setBackground("#1e293b")
    .setFontColor("#e2e8f0");
  logSync("apps_script", TAB_LEADS, sh.getLastRow() - 1, "ok", "Lead headers updated (data kept)");
  return LEAD_CRM_HEADERS.length;
}

function leadRange(col) {
  return "'" + TAB_LEADS + "'!" + col + ":" + col;
}

/** SALES dashboard — 07_Lead_CRM + 02_Order_Master (orders separate) */
function salesDashboardFormulas_() {
  var A = leadRange("A");
  var C = leadRange("C");
  var D = leadRange("D");
  var E = leadRange("E");
  var G = leadRange("G"); // Next Followup Date
  var Oa = "'" + TAB_ORDER + "'!A:A";
  var Ot = "'" + TAB_ORDER + "'!T:T";
  var Oam = "'" + TAB_ORDER + "'!AM:AM";
  var leadCount =
    "IFERROR(COUNTA(FILTER(" + A + "," + A + '<>""))-COUNTIF(' + A + ',"Lead ID"),0)';
  var orderCount =
    "IFERROR(COUNTA(FILTER(" + Oa + "," + Oa + '<>""))-COUNTIF(' + Oa + ',"Order ID"),0)';
  return {
    "Total Leads": "=" + leadCount,
    "Today's Followups":
      "=COUNTIFS(" + G + ",TODAY()," + D + ',"<>WON",' + D + ',"<>LOST")',
    "Dormant Leads":
      "=COUNTIFS(" + G + ',"<"&TODAY()-30,' + D + ',"<>WON",' + D + ',"<>LOST")',
    "Pending Followups":
      "=IFERROR(ROWS(FILTER(" + A + ",(" + G + "<TODAY())*(" + G + '<>"")*(' +
      D + '<>"WON")*(' + D + '<>"LOST"))),0)',
    "Leads by Source": "=COUNTIF(" + D + ',"NEW")',
    "Pending Quotations": "=COUNTIF(" + D + ',"QUOATED")',
    "Leads by Material Type": "=COUNTIF(" + D + ',"QUALIFIED")',
    "NOT YET STARTED": "=COUNTIF(" + D + ',"NEW")',
    "Lost Orders": "=COUNTIF(" + D + ',"LOST")',
    "ERROR IN DATA FILLING":
      "=SUMPRODUCT(((" + C + '="")+(' + G + '="")+(' + E + '=""))*(' + A + '<>""))',
    "Total Order": "=" + orderCount,
    "Order Conversion %": "=IFERROR((" + orderCount + ")/(" + leadCount + '),"")',
    "Dispatched Orders":
      "=COUNTIF(" + Ot + ',"Dispatched")+COUNTIF(' + Ot + ',"DISPATCHED")',
    "Blocked Orders": "=COUNTIF(" + Oam + ',"High")',
  };
}

function setupSalesDashboardFormulas() {
  var ss = getSpreadsheet();
  var dash = ss.getSheetByName("01_Dashboard");
  if (!dash) throw new Error("01_Dashboard tab missing");
  var salesLabels = ensureDashboardSalesLabels();
  var formulas = salesDashboardFormulas_();
  var applied = [];
  var missed = [];
  Object.keys(formulas).forEach(function (label) {
    if (applyFormulaByLabel(dash, label, formulas[label], SALES_LABEL_ALIASES[label] || [])) {
      applied.push(label);
    } else {
      missed.push(label);
    }
  });
  logSync(
    "apps_script", "01_Dashboard", applied.length,
    missed.length ? "partial" : "ok",
    "Sales formulas: " + applied.length + " set; missed: " +
      (missed.length ? missed.join(", ") : "none")
  );
  return { applied: applied, missed: missed, salesLabelsAdded: salesLabels };
}

/** ClickUp minimal leads + sales dashboard formulas */
function setupClickUpLeadPipeline() {
  var cols = extendLeadCrmMinimalHeaders();
  var sales = setupSalesDashboardFormulas();
  return { leadColumns: cols, salesFormulas: sales };
}

/**
 * FIX 1 + FIX 2: ClickUp custom field reader —
 * dropdown ka NAAM nikalta hai (index nahi), date ms ko yyyy-MM-dd banata hai,
 * labels join karta hai.
 */
function clickUpCustomField(fields, names) {
  if (!fields || !fields.length) return "";
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    var n = String(f.name || "").toLowerCase();
    var hit = false;
    for (var j = 0; j < names.length; j++) {
      if (n.indexOf(names[j]) >= 0) { hit = true; break; }
    }
    if (!hit) continue;
    var v = f.value;
    if (v == null || v === "") continue;

    // dropdown: value = option index/id → option ka naam nikalo
    if (f.type === "drop_down" && f.type_config && f.type_config.options) {
      var opts = f.type_config.options;
      for (var k = 0; k < opts.length; k++) {
        if (String(opts[k].orderindex) === String(v) || String(opts[k].id) === String(v)) {
          return String(opts[k].name || "").trim();
        }
      }
    }
    // labels: array of ids → naam join karo
    if (f.type === "labels" && f.type_config && f.type_config.options && Array.isArray(v)) {
      var out = [];
      v.forEach(function (id) {
        (f.type_config.options || []).forEach(function (o) {
          if (String(o.id) === String(id)) out.push(o.label || o.name || "");
        });
      });
      if (out.length) return out.join(", ");
    }
    // date field: ms → yyyy-MM-dd (FIX 2)
    if (f.type === "date") return clickUpMsToDate(v);
    if (typeof v === "object" && v.value != null) return String(v.value).trim();
    if (Array.isArray(v)) return v.join(", ");
    return String(v).trim();
  }
  return "";
}

function clickUpMsToDate(ms) {
  if (!ms) return "";
  var n = Number(ms);
  if (!isFinite(n) || n <= 0) return "";
  return Utilities.formatDate(new Date(n), Session.getScriptTimeZone(), "yyyy-MM-dd");
}

/** FIX 2: koi bhi value → date; 13-digit ms convert hota hai, chhote numbers (3,4) reject */
function clickUpAnyToDate(v) {
  if (!v) return "";
  var s = String(v).trim();
  var n = Number(s);
  if (isFinite(n)) {
    if (n > 100000000000) return clickUpMsToDate(n); // ms timestamp
    return ""; // 3, 4, 2 jaise numbers date NAHI hain
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  var d = new Date(s);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return "";
}

function normalizeClickUpStatus(status) {
  if (!status) return "NEW";
  var s = String(status).trim().toUpperCase();
  if (s === "QUOTED") return "QUOATED";
  if (
    s === "NEW" || s === "CONTACTED" || s === "QUALIFIED" || s === "QUOATED" ||
    s === "NEGOTIATION" || s === "LOST" || s === "WON"
  )
    return s;
  if (s.indexOf("WON") >= 0) return "WON";
  if (s.indexOf("LOST") >= 0) return "LOST";
  if (s.indexOf("NEGOTIAT") >= 0) return "NEGOTIATION";
  if (s.indexOf("QUOAT") >= 0 || s.indexOf("QUOT") >= 0) return "QUOATED";
  if (s.indexOf("QUALIF") >= 0) return "QUALIFIED";
  if (s.indexOf("CONTACT") >= 0) return "CONTACTED";
  return "NEW";
}

/** ClickUp list → 07_Lead_CRM (FIX 1: pure 15 columns) */
function syncClickUpToLeadCrm() {
  var token = getProp("CLICKUP_API_TOKEN");
  var listId = getProp("CLICKUP_LIST_ID");
  if (!token || !listId) {
    throw new Error("Script properties: CLICKUP_API_TOKEN, CLICKUP_LIST_ID");
  }
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName(TAB_LEADS);
  if (!sh) sh = ss.insertSheet(TAB_LEADS);
  extendLeadCrmMinimalHeaders();
  var url =
    "https://api.clickup.com/api/v2/list/" + listId +
    "/task?archived=false&include_closed=true&subtasks=true&page=0";
  var res = UrlFetchApp.fetch(url, {
    headers: { Authorization: token },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) {
    throw new Error("ClickUp " + res.getResponseCode() + ": " + res.getContentText().slice(0, 200));
  }
  var data = JSON.parse(res.getContentText() || "{}");
  var tasks = data.tasks || [];
  var rows = [];
  tasks.forEach(function (t) {
    if (!t.name) return;
    var cf = t.custom_fields;
    var mobile = clickUpCustomField(cf, ["mobile", "phone", "contact"]);
    var assignee =
      (t.assignees && t.assignees[0] && (t.assignees[0].username || t.assignees[0].email)) || "";
    // FIX 2: due date — task due_date pehle; custom field sirf SPECIFIC naam se
    // ("followup attempt" jaise number fields ab match nahi honge)
    var due =
      clickUpMsToDate(t.due_date) ||
      clickUpAnyToDate(
        clickUpCustomField(cf, ["next follow-up date", "next followup date", "follow-up date", "followup date", "next follow-up", "next followup"])
      );
    // v7: Followup Count (number custom field) + Remark (latest comment ya custom field)
    var followupCount = clickUpCustomField(cf, [
      "followup count", "follow-up count", "followup attempt", "follow-up attempt", "attempt",
    ]);
    var remark =
      clickUpLatestComment_(t.id, token) ||
      clickUpCustomField(cf, ["remarks", "remark", "notes", "note"]);

    rows.push([
      t.id,
      t.name,
      mobile,
      normalizeClickUpStatus(t.status && t.status.status),
      assignee,
      (t.priority && t.priority.priority) || "",
      due,            // Next Followup Date
      followupCount,  // Followup Count
      clickUpMsToDate(t.date_created), // Start Date
      remark,         // Remark
    ]);
  });
  var last = sh.getLastRow();
  if (last > 1) sh.deleteRows(2, last - 1);
  if (rows.length) {
    sh.getRange(2, 1, rows.length, LEAD_CRM_HEADERS.length).setValues(rows);
  }
  logSync("clickup", TAB_LEADS, rows.length, "ok", "ClickUp → lead CRM synced (v7 simple)");
  return rows.length;
}

/** v7: Task ka latest comment text lao (Remark column ke liye) */
function clickUpLatestComment_(taskId, token) {
  try {
    var res = UrlFetchApp.fetch(
      "https://api.clickup.com/api/v2/task/" + taskId + "/comment",
      { headers: { Authorization: token }, muteHttpExceptions: true }
    );
    if (res.getResponseCode() >= 300) return "";
    var comments = (JSON.parse(res.getContentText() || "{}").comments) || [];
    if (!comments.length) return "";
    var c = comments[0]; // sabse naya comment
    var txt = String(c.comment_text || "").replace(/\s+/g, " ").trim();
    if (txt.length > 200) txt = txt.slice(0, 200) + "...";
    return ((c.user && c.user.username) ? c.user.username + ": " : "") + txt;
  } catch (e) {
    return "";
  }
}

function ensureClickUpScriptProps() {
  /* set once via Script Properties UI — keys documented in SETUP-HINDI */
}

/** One-shot: finance + leads + orders structure + dashboard formulas + daily trigger */
function setupAllFbosHub() {
  syncConfigToScriptProperties();
  ensureConfigFinanceKeys();
  extendLeadCrmMinimalHeaders();
  extendOrderMasterUnifiedHeaders();
  var finance = setupFinanceDashboardFormulas();
  var legacy = replaceLegacyFinanceFormulasOnDashboard();
  hideLegacyFinanceTabs();
  var sales = setupSalesDashboardFormulas();
  setupDailyTriggers();
  return {
    financeApplied: finance.applied.length,
    financeMissed: finance.missed,
    legacyReplaced: legacy.replaced.length,
    salesApplied: sales.applied.length,
    salesMissed: sales.missed,
    triggers: "syncAllHub daily 8am",
  };
}

/**
 * Resume interrupted setup — safe to re-run (no data wipe).
 * Fixes dashboard formulas, hides legacy finance tabs, refreshes ClickUp, daily trigger.
 */
function resumeFbosSetup() {
  syncConfigToScriptProperties();
  ensureConfigFinanceKeys();
  var finance = setupSingleSheetFinance();
  var sales = setupSalesDashboardFormulas();
  var leads = 0;
  var leadErr = "";
  try {
    leads = syncClickUpToLeadCrm();
  } catch (e) {
    leadErr = String(e);
    logSync("clickup", TAB_LEADS, 0, "error", leadErr);
  }
  setupDailyTriggers();
  logSync(
    "apps_script", "00_Sync_Status", leads,
    leadErr ? "partial" : "ok",
    "resumeFbosSetup complete (v6)"
  );
  return {
    finance: finance,
    sales: { applied: sales.applied.length, missed: sales.missed },
    leadsSynced: leads,
    leadError: leadErr || null,
    triggers: "syncAllHub daily 8am",
  };
}
