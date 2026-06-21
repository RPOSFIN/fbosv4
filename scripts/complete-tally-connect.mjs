#!/usr/bin/env node
/** End-to-end Tally connect verification (cloud + env + webapp + webhook). */
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

const report = { steps: [], overallOk: true };

function step(name, ok, detail) {
  report.steps.push({ name, ok, detail });
  if (!ok) report.overallOk = false;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
}

async function main() {
  console.log("=== COMPLETE TALLY CONNECT ===\n");

  const envKeys = [
    "TALLY_HOST",
    "TALLY_PORT",
    "TALLY_COMPANY_NAME",
    "GOOGLE_WEBAPP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SHEET_SYNC_SECRET",
  ];
  for (const k of envKeys) {
    const v = process.env[k];
    step(`env:${k}`, k.includes("SECRET") || k.includes("KEY") ? Boolean(v) : Boolean(v) || k === "SUPABASE_SERVICE_ROLE_KEY", v ? (k.includes("SECRET") || k.includes("KEY") ? "set" : v) : "missing");
  }

  const url = process.env.GOOGLE_WEBAPP_URL;
  if (url) {
    const getRes = await fetch(url, { redirect: "follow" });
    const getText = await getRes.text();
    let json = null;
    try { json = JSON.parse(getText); } catch { /* */ }
    step("webapp GET", getRes.ok && json?.ok, `${getRes.status} ${json?.service || getText.slice(0, 60)}`);
  }

  const port = process.env.TALLY_PORT || "9007";
  const host = process.env.TALLY_HOST || "";
  if (host) {
    const endpoint = `http://${host}:${port}`;
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/xml" },
        body: "<ENVELOPE></ENVELOPE>",
        signal: AbortSignal.timeout(8000),
      });
      step("tally gateway", true, endpoint);
    } catch (e) {
      step("tally gateway", false, `${endpoint} — ${e instanceof Error ? e.message : e}`);
    }
  }

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (sbUrl && sbKey) {
    const sb = createClient(sbUrl, sbKey);
    const { count, error } = await sb
      .from("finance_import_queue")
      .select("*", { count: "exact", head: true });
    step("supabase finance_import_queue", !error, error ? error.message : `count=${count}`);
    const { data: integ } = await sb
      .from("integrations")
      .select("connector_name, status, last_sync_at")
      .eq("connector_name", "tally")
      .maybeSingle();
    step("supabase integrations.tally", true, JSON.stringify(integ || {}));
  }

  const secret = process.env.SHEET_SYNC_SECRET;
  const base = process.env.FBOS_PUBLIC_URL || "http://localhost:3001";
  const webhook = `${base.replace(/\/$/, "")}/api/webhooks/tally-finance`;
  if (secret) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          action: "tally_finance",
          records: [
            {
              data_type: "ledger",
              company_name: "Flexiflair Tech Private Limited",
              ledger_name: "FBOS_Webhook_Test",
              amount: 0,
              description: "complete-tally-connect test",
            },
          ],
        }),
      });
      const json = await res.json().catch(() => null);
      step("fbos webhook", res.ok && json?.ok, json ? JSON.stringify(json) : String(res.status));
    } catch (e) {
      step("fbos webhook", false, e instanceof Error ? e.message : String(e));
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(report, null, 2));
  if (!report.overallOk) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
