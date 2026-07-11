/**
 * Direct P0 sync — runs integration libraries in-process (no dev server required).
 * Usage: npx tsx scripts/p0-sync-direct.ts
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { syncClickUp } from "@/lib/integrations/clickup";
import { syncGSheetHub } from "@/lib/integrations/gsheet-hub";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const path = join(root, ".env.local");
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
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

async function main() {
  loadEnv();

  console.log("=== DIRECT GSheet sync ===");
  const gsheet = await syncGSheetHub();
  console.log(JSON.stringify(gsheet, null, 2));

  console.log("\n=== DIRECT ClickUp sync ===");
  const clickup = await syncClickUp();
  console.log(JSON.stringify(clickup, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
