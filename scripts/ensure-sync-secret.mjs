#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "fs";
import { randomBytes } from "crypto";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
let text = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
if (!/SHEET_SYNC_SECRET=/.test(text)) {
  const secret = `fbos-${randomBytes(16).toString("hex")}`;
  text += `${text.endsWith("\n") || !text ? "" : "\n"}SHEET_SYNC_SECRET=${secret}\n`;
  writeFileSync(envPath, text, "utf8");
  console.log("Added SHEET_SYNC_SECRET to .env.local");
} else {
  console.log("SHEET_SYNC_SECRET already present");
}
