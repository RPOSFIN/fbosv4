/** Shared GID resolution for trace scripts (mirrors lib/google-config.ts). */

const OPERATIONS_GID_KEYS = [
  "GOOGLE_SHEET_GID_OPERATIONS",
  "GOOGLE_SHEET_GID_ORDERS",
  "GOOGLE_SHEET_GID_JOBS",
];

export function envTrim(...keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

export function getOperationsGidCandidates() {
  const seen = new Set();
  const out = [];
  for (const key of OPERATIONS_GID_KEYS) {
    const gid = process.env[key]?.trim();
    if (gid && !seen.has(gid)) {
      seen.add(gid);
      out.push({ gid, source: key });
    }
  }
  return out;
}

export function resolveOperationsGid() {
  return getOperationsGidCandidates()[0] ?? { gid: "", source: "" };
}

export function getSheetTabGids() {
  const fallback = envTrim("GOOGLE_SHEET_GID");
  const ops = resolveOperationsGid();
  return {
    leads: envTrim("GOOGLE_SHEET_GID_LEADS", "GOOGLE_SHEET_GID") || fallback,
    clients: envTrim("GOOGLE_SHEET_GID_CLIENTS"),
    quotations: envTrim("GOOGLE_SHEET_GID_QUOTATIONS"),
    jobs:
      envTrim(
        "GOOGLE_SHEET_GID_JOBS",
        "GOOGLE_SHEET_GID_ORDERS",
        "GOOGLE_SHEET_GID_OPERATIONS"
      ) || ops.gid,
    followups: envTrim("GOOGLE_SHEET_GID_FOLLOWUPS"),
    operations: ops.gid,
    operationsSource: ops.source,
    finance: envTrim("GOOGLE_SHEET_GID_FINANCE", "GOOGLE_SHEET_GID"),
  };
}

export function normalizeSheetKey(key) {
  return key
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function extractJobNo(lower) {
  return (
    lower.job_no ||
    lower.job_number ||
    lower.job_id ||
    lower.order_no ||
    lower.order_id ||
    lower.orderid ||
    ""
  );
}

export function countJobCandidates(rows) {
  let withOrderId = 0;
  const samples = [];
  for (const raw of rows) {
    const lower = {};
    for (const [k, v] of Object.entries(raw)) {
      lower[normalizeSheetKey(k)] = String(v || "").trim();
    }
    const jobNo = extractJobNo(lower);
    if (jobNo) {
      withOrderId++;
      if (samples.length < 3) {
        samples.push({ order_id: lower.order_id, job_no: jobNo });
      }
    }
  }
  return { total: rows.length, withJobKey: withOrderId, samples };
}
