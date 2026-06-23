#!/usr/bin/env node
/** Verify Google webapp GET health + POST tally_finance (GAS redirect-safe). */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

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

const url =
  process.env.GOOGLE_WEBAPP_URL ||
  "https://script.google.com/macros/s/AKfycbzqkpY-z-fuXhdHp6s1sn090ZuqWzU1x7CbGC1hciDKUPqvmQFHKhQ6HM9P4U1pBBa6iw/exec";

async function gasPost(webappUrl, payload) {
  const body = JSON.stringify(payload);
  const headers = { "Content-Type": "application/json" };
  let res = await fetch(webappUrl, {
    method: "POST",
    headers,
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(60000),
  });
  if ([301, 302, 303, 307, 308].includes(res.status)) {
    const loc = res.headers.get("location");
    if (loc) {
      res = await fetch(loc, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(60000),
      });
    }
  }
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html error page */
  }
  return { status: res.status, json, textPreview: text.slice(0, 200) };
}

async function main() {
  console.log("=== WEBAPP TALLY PIPELINE TEST ===\n");
  console.log("URL:", url);

  console.log("\n[1] GET health...");
  const getRes = await fetch(url, { redirect: "follow" });
  const getText = await getRes.text();
  let getJson = null;
  try {
    getJson = JSON.parse(getText);
  } catch {
    /* ignore */
  }
  console.log("  status:", getRes.status);
  console.log("  body:", getJson || getText.slice(0, 120));

  console.log("\n[2] POST tally_finance (1 test row)...");
  const post = await gasPost(url, {
    action: "tally_finance",
    records: [
      {
        data_type: "ledger",
        company_name: "Flexiflair Tech Private Limited",
        ledger_name: "FBOS_Webapp_Test",
        parent_group: "Test",
        amount: 0,
        description: "Webapp POST connectivity test",
        synced_at: new Date().toISOString(),
      },
    ],
  });
  console.log("  status:", post.status);
  if (post.json) console.log("  json:", JSON.stringify(post.json, null, 2));
  else console.log("  preview:", post.textPreview);

  if (post.status === 405 || (post.textPreview || "").includes("Page Not Found")) {
    console.log("\nFIX: Apps Script redeploy required:");
    console.log("  Deploy > New deployment > Web app");
    console.log("  Execute as: Me | Who has access: Anyone");
    console.log("  doPost must accept action=tally_finance (Code.gs already has this)");
  } else if (post.json?.ok) {
    console.log("\nPASS: Sheet tab 06_Finance_Sync should have test row.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
