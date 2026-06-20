#!/usr/bin/env node
/**
 * P0 data population closure — jobs + clickup_tasks
 */
import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    if (!process.env[trimmed.slice(0, idx).trim()]) {
      process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
}

loadEnv();

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function count(table) {
  const { count, error } = await sb.from(table).select("*", { head: true, count: "exact" });
  return error ? { count: null, error: error.message } : { count: count ?? 0 };
}

function run(cmd, args) {
  const isWin = process.platform === "win32";
  const r = spawnSync(isWin ? cmd + ".cmd" : cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: isWin,
  });
  return r.status ?? 1;
}

console.log("=== P0 CLOSE ===");
const before = {
  jobs: await count("jobs"),
  clickup_tasks: await count("clickup_tasks"),
};
console.log("BEFORE", before);

run("node", ["scripts/apply-integrations-migration.mjs"]);
run("node", ["scripts/p0-backfill-jobs.mjs"]);

const syncStatus = run("node", ["scripts/run-p0-closure.mjs", "--direct"]);
if (syncStatus !== 0) {
  run("npx", ["tsx", "scripts/p0-sync-direct.ts"]);
}

run("node", ["scripts/p0-backfill-clickup.mjs"]);

const after = {
  jobs: await count("jobs"),
  clickup_tasks: await count("clickup_tasks"),
};
console.log("AFTER", after);

const ok = (after.jobs.count ?? 0) > 1 && (after.clickup_tasks.count ?? 0) > 0;
process.exit(ok ? 0 : 1);
