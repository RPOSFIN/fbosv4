/**
 * Quick sanity check for lead sync compare logic (no DB required).
 * Run: node scripts/test-lead-sync-logic.mjs
 */

function normalizeEmail(email) {
  return (email || "").toLowerCase().trim();
}

function normalizeMobile(mobile) {
  const digits = (mobile || "").replace(/\D/g, "");
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

function fieldValue(field, value) {
  switch (field) {
    case "email":
      return normalizeEmail(value);
    case "mobile":
      return normalizeMobile(value);
    case "company_name":
      return (value || "").toLowerCase().trim();
    case "status":
      return (value || "NEW").toUpperCase().trim();
    default:
      return (value || "").trim();
  }
}

const FIELDS = [
  "company_name",
  "contact_person",
  "mobile",
  "email",
  "status",
  "source",
  "clickup_task_id",
];

function leadFieldsMatch(existing, incoming) {
  for (const field of FIELDS) {
    const oldVal = fieldValue(field, existing[field]);
    const newVal = fieldValue(field, incoming[field]);
    if (oldVal !== newVal) return false;
  }
  return true;
}

const existing = {
  company_name: "Acme Corp",
  contact_person: "Raj",
  mobile: "+91 98765 43210",
  email: "raj@acme.com",
  status: "NEW",
  source: "Google Sheets",
  clickup_task_id: null,
};

const sameIncoming = {
  company_name: "acme corp",
  contact_person: "Raj",
  mobile: "9876543210",
  email: "RAJ@ACME.COM",
  status: "new",
  source: "Google Sheets",
};

const changedIncoming = { ...sameIncoming, status: "CONTACTED" };

let passed = 0;
let failed = 0;

function assert(name, cond) {
  if (cond) {
    passed++;
    console.log(`✓ ${name}`);
  } else {
    failed++;
    console.error(`✗ ${name}`);
  }
}

assert("identical rows → skip", leadFieldsMatch(existing, sameIncoming));
assert("changed status → update", !leadFieldsMatch(existing, changedIncoming));

// Simulate 2nd sync: all rows unchanged → all skipped
const batch = [sameIncoming, sameIncoming];
const skipped = batch.filter((row) => leadFieldsMatch(existing, row)).length;
assert("2nd sync all unchanged → all skipped", skipped === 2);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
