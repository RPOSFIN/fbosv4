#!/usr/bin/env node
/**
 * Remote resume — after Apps Script redeploy with updated Code.gs (doGet resume action).
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");

function loadEnv() {
  if (!existsSync(envPath)) return {};
  const map = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    map[t.slice(0, i)] = t.slice(i + 1);
  }
  return map;
}

const env = loadEnv();
const webapp = env.GOOGLE_WEBAPP_URL;
const secret = env.SHEET_SYNC_SECRET;

if (!webapp || !secret) {
  console.error("Missing GOOGLE_WEBAPP_URL or SHEET_SYNC_SECRET in .env.local");
  process.exit(1);
}

const url = `${webapp}?action=resume&secret=${encodeURIComponent(secret)}`;
console.log("Calling resumeFbosSetup via web app...");
const res = await fetch(url, { redirect: "follow" });
const text = await res.text();
console.log("Status:", res.status);
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text.slice(0, 500));
}
