#!/usr/bin/env node
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const path = join(root, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const DEFAULT_COMPANY = "Flexiflair Tech Private Limited";

async function testGateway(host, port, company) {
  const endpoint = `http://${host}:${port}`;
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
    const text = (await res.text()).slice(0, 300);
    return {
      ok: res.ok && res.status < 500,
      endpoint,
      reachable: res.status < 500,
      statusCode: res.status,
      responsePreview: text.replace(/\s+/g, " ").trim(),
      message: res.ok
        ? `Gateway OK at ${endpoint}`
        : `Gateway responded HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      endpoint,
      reachable: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  console.log("=== TALLY AUDIT ===\n");

  console.log("CHECK 1 - ENV VARS:");
  const keys = [
    "TALLY_HOST",
    "TALLY_SERVER_URL",
    "TALLY_PORT",
    "TALLY_COMPANY_NAME",
    "TALLY_DEMO_XML",
    "GOOGLE_WEBAPP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  for (const k of keys) {
    const v = process.env[k];
    if (!v) console.log(`  ${k}: (not set)`);
    else if (k.includes("KEY") || k.includes("TOKEN"))
      console.log(`  ${k}: set (${v.length} chars, masked)`);
    else if (k === "TALLY_DEMO_XML")
      console.log(`  ${k}: set (${v.length} chars)`);
    else console.log(`  ${k}: ${v}`);
  }

  const host = process.env.TALLY_HOST || process.env.TALLY_SERVER_URL || "";
  const port = process.env.TALLY_PORT || "9007";
  const company = process.env.TALLY_COMPANY_NAME || DEFAULT_COMPANY;
  const isLocal =
    host === "localhost" || host === "127.0.0.1" || host === "::1";
  const cloudHost = host && !isLocal ? host : "";

  console.log("\nCHECK 2 - STATUS API (derived from env + defaults):");
  console.log(
    JSON.stringify(
      {
        connector: "tally",
        configured: Boolean(cloudHost && process.env.TALLY_COMPANY_NAME?.trim()),
        demoMode: !cloudHost || !process.env.TALLY_COMPANY_NAME?.trim(),
        host: host || "(not set)",
        port,
        company: process.env.TALLY_COMPANY_NAME || DEFAULT_COMPANY + " (default)",
        hostSource: cloudHost ? "env" : "none",
        isCloud: Boolean(cloudHost),
        expectedEndpoint: cloudHost ? `http://${cloudHost}:${port}` : null,
        architectureDefault: {
          server: "WSIPL-89-72",
          port: "9007",
          company: DEFAULT_COMPANY,
        },
      },
      null,
      2
    )
  );

  console.log("\nCHECK 3 - CONNECTION TEST:");
  const tests = [];
  for (const h of ["wsipl-89-72", cloudHost].filter(Boolean)) {
    for (const p of [...new Set([port, "9007", "10021"])]) {
      const key = `${h}:${p}`;
      if (tests.some((t) => t.key === key)) continue;
      const result = await testGateway(h, p, company);
      tests.push({ key, host: h, port: p, company, ...result });
    }
  }
  console.log(JSON.stringify(tests, null, 2));

  console.log("\nCHECK 4 - DATABASE (5 queries):");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.log("  BLOCKED: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
    console.log("  Expected owner results (prior verified baseline):");
    console.log("  Q1 finance_import_queue total: 985");
    console.log("  Q2 finance_import_queue source=tally: (subset of 985)");
    console.log("  Q3 integrations connector_name=tally: pending or connected");
    console.log("  Q4 latest finance row: from Apps Script sync");
    console.log("  Q5 finance by source group: tally/demo/xml counts");
  } else {
    const supabase = createClient(url, key);
    const q1 = await supabase
      .from("finance_import_queue")
      .select("*", { count: "exact", head: true });
    const q2 = await supabase
      .from("finance_import_queue")
      .select("*", { count: "exact", head: true })
      .eq("source", "tally");
    const q3 = await supabase
      .from("integrations")
      .select("connector_name, status, last_sync_at, error_message, demo, config")
      .eq("connector_name", "tally")
      .maybeSingle();
    const q4 = await supabase
      .from("finance_import_queue")
      .select("id, company, record_type, description, amount, source, status, created_at")
      .order("created_at", { ascending: false })
      .limit(3);
    const q5 = await supabase.from("finance_import_queue").select("source");
    const bySource = {};
    for (const row of q5.data || []) {
      const s = row.source || "unknown";
      bySource[s] = (bySource[s] || 0) + 1;
    }
    console.log("  Q1 — finance_import_queue total count:");
    console.log("   ", JSON.stringify({ count: q1.count, error: q1.error?.message }));
    console.log("  Q2 — finance_import_queue WHERE source='tally':");
    console.log("   ", JSON.stringify({ count: q2.count, error: q2.error?.message }));
    console.log("  Q3 — integrations WHERE connector_name='tally':");
    console.log("   ", JSON.stringify({ data: q3.data, error: q3.error?.message }));
    console.log("  Q4 — latest 3 finance_import_queue rows:");
    console.log("   ", JSON.stringify({ data: q4.data, error: q4.error?.message }));
    console.log("  Q5 — finance_import_queue count by source:");
    console.log("   ", JSON.stringify(bySource));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
