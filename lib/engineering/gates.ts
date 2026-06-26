import { execFile } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { promisify } from "util";
import { getAdminClient } from "@/lib/supabase/admin";
import type { GateResult, VerificationResult } from "@/lib/engineering/types";

const execFileAsync = promisify(execFile);
const REPO_ROOT = process.cwd();

/** Critical routes the route gate checks (stable routes only). */
const CRITICAL_ROUTES = ["/engineering-center", "/compliance", "/lead-master"];

async function buildGate(): Promise<GateResult> {
  const tsc = join(REPO_ROOT, "node_modules", ".bin", "tsc");
  if (!existsSync(tsc)) {
    return { name: "build", status: "FAIL", detail: "tsc not found (run npm install)" };
  }
  try {
    await execFileAsync(tsc, ["--noEmit"], { cwd: REPO_ROOT, timeout: 180_000 });
    return { name: "build", status: "PASS", detail: "tsc --noEmit: 0 errors" };
  } catch (e) {
    const out = (e as { stdout?: string }).stdout || (e as Error).message || "";
    const first = out.split("\n").find((l) => /error TS/.test(l)) || "type-check failed";
    return { name: "build", status: "FAIL", detail: first.trim().slice(0, 200) };
  }
}

async function ping(url: string, timeoutMs = 15_000): Promise<{ ok: boolean; status: number; body?: string }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const body = await res.text();
    return { ok: res.status < 500, status: res.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: (e as Error).message };
  }
}

async function runtimeGate(origin: string): Promise<GateResult> {
  const r = await ping(`${origin}/api/engineering/info`);
  return r.ok
    ? { name: "runtime", status: "PASS", detail: `server responding (HTTP ${r.status})` }
    : { name: "runtime", status: "FAIL", detail: `server not responding (HTTP ${r.status})` };
}

async function apiGate(origin: string): Promise<GateResult> {
  const r = await ping(`${origin}/api/integrations/health`);
  return r.ok
    ? { name: "api", status: "PASS", detail: `API healthy (HTTP ${r.status})` }
    : { name: "api", status: "FAIL", detail: `API error (HTTP ${r.status})` };
}

async function databaseGate(): Promise<GateResult> {
  const supabase = getAdminClient();
  if (!supabase) {
    return { name: "database", status: "FAIL", detail: "Supabase admin client unavailable (no SERVICE_ROLE key)" };
  }
  const { error } = await supabase.from("profiles").select("id", { head: true, count: "exact" });
  return error
    ? { name: "database", status: "FAIL", detail: error.message.slice(0, 200) }
    : { name: "database", status: "PASS", detail: "Supabase reachable; core table query OK" };
}

async function routeGate(origin: string): Promise<GateResult> {
  const failed: string[] = [];
  for (const route of CRITICAL_ROUTES) {
    const r = await ping(`${origin}${route}`);
    if (!r.ok) failed.push(`${route} (HTTP ${r.status})`);
  }
  return failed.length === 0
    ? { name: "route", status: "PASS", detail: `${CRITICAL_ROUTES.length} critical routes OK` }
    : { name: "route", status: "FAIL", detail: `failing: ${failed.join(", ")}` };
}

async function consoleGate(origin: string): Promise<GateResult> {
  const r = await ping(`${origin}/engineering-center`);
  const compileError =
    !!r.body && /Ecmascript file had an error|getCompilationErrors|Failed to compile/i.test(r.body);
  return !compileError && r.ok
    ? { name: "console", status: "PASS", detail: "no server compile errors detected" }
    : { name: "console", status: "FAIL", detail: compileError ? "compile error detected in served route" : `route error (HTTP ${r.status})` };
}

/** Run all verification gates. Build runs first; the rest run in parallel. */
export async function runGates(origin: string): Promise<VerificationResult> {
  const build = await buildGate();
  const [runtime, api, database, route, consoleG] = await Promise.all([
    runtimeGate(origin),
    apiGate(origin),
    databaseGate(),
    routeGate(origin),
    consoleGate(origin),
  ]);
  const gates = [build, runtime, api, database, route, consoleG];
  const failed = gates.filter((g) => g.status === "FAIL").map((g) => g.name);
  return { gates, allPass: failed.length === 0, failed };
}
