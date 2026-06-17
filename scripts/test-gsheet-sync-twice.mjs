#!/usr/bin/env node
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();
process.chdir(root);

const { syncGSheet } = await import("../lib/integrations/gsheet.ts");

console.log("GSheet Sync — Run 1");
const r1 = await syncGSheet();
console.log(JSON.stringify({
  ok: r1.ok,
  imported: r1.leadsImported,
  updated: r1.leadsUpdated,
  skipped: r1.leadsSkipped,
  message: r1.message,
}, null, 2));

console.log("\nGSheet Sync — Run 2 (expect 0 inserted, mostly updated/skipped)");
const r2 = await syncGSheet();
console.log(JSON.stringify({
  ok: r2.ok,
  imported: r2.leadsImported,
  updated: r2.leadsUpdated,
  skipped: r2.leadsSkipped,
  message: r2.message,
}, null, 2));

const pass = r2.ok && (r2.leadsImported ?? 0) === 0;
console.log(`\nIdempotency: ${pass ? "PASS" : r2.ok ? "CHECK COUNTS" : "SKIP (not configured)"}`);
