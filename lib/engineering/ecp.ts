import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type {
  EcpRecord,
  EngState,
  ThreeRPointer,
  TimelineEvent,
} from "@/lib/engineering/types";

/**
 * EngineeringOS — Recovery Engine core store (Phase 2).
 *
 * Owns Engineering Checkpoint (ECP) records, the engineering state machine,
 * the engineering timeline, the latest-3R pointer, and automation config.
 * Git remains the source of truth; this layer manages local engineering state
 * and writes local artifacts under /ecp. Promotion git tagging lives in
 * lib/engineering/promotion.ts. No process here pushes to a remote.
 */

const REPO_ROOT = process.cwd();
const ECP_DIR = join(REPO_ROOT, "ecp");
const TIMELINE_FILE = join(ECP_DIR, "timeline.json");
const THREER_FILE = join(ECP_DIR, "3r.json");
const CONFIG_FILE = join(ECP_DIR, "config.json");

export function git(args: string[]): string {
  try {
    return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function parseRepository(): string {
  const url = git(["config", "--get", "remote.origin.url"]);
  const m = url.match(/github\.com[:/]+([^/\s]+\/[^/\s]+?)(?:\.git)?$/i);
  return m ? m[1] : url || "unknown";
}

export function collectGitState() {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]) || "unknown";
  const commit = git(["rev-parse", "HEAD"]) || "unknown";
  const commitShort = git(["rev-parse", "--short", "HEAD"]) || "unknown";
  const lastCommitMessage = git(["log", "-1", "--pretty=%s"]) || "unknown";
  const porcelain = git(["status", "--porcelain"]);
  const gitStatus = porcelain ? porcelain.split("\n").filter(Boolean) : [];
  return {
    repository: parseRepository(),
    branch,
    commit,
    commitShort,
    lastCommitMessage,
    gitClean: gitStatus.length === 0,
    gitStatus,
  };
}

/** Read a text file, auto-decoding UTF-16LE (some memory docs use it). */
function readSafe(path: string): string | null {
  try {
    const buf = readFileSync(path);
    if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.toString("utf16le").slice(1);
    if (buf.length >= 2 && buf[0] !== 0x00 && buf[1] === 0x00) return buf.toString("utf16le");
    return buf.toString("utf8");
  } catch {
    return null;
  }
}

function cleanInline(s: string): string {
  return s.replace(/[`*]/g, "").trim();
}

export function getCurrentSprint(): string {
  const status = readSafe(join(REPO_ROOT, "docs", "02_PROJECT_STATUS.md"));
  if (status) {
    const explicit = status.match(/\*\*Current sprint:\*\*\s*([^\n]+)/i);
    if (explicit) return cleanInline(explicit[1]);
    const title = status.match(/^#\s*Project Status:\s*([^\n]+)/im);
    if (title) return cleanInline(title[1]);
  }
  return "unknown";
}

function ensureEcpDir() {
  if (!existsSync(ECP_DIR)) mkdirSync(ECP_DIR, { recursive: true });
}

function listEcpFiles(): string[] {
  if (!existsSync(ECP_DIR)) return [];
  return readdirSync(ECP_DIR).filter((f) => /^ECP-\d{4}\.json$/.test(f)).sort();
}

export function getEcp(id: string): EcpRecord | null {
  const raw = readSafe(join(ECP_DIR, `${id}.json`));
  if (!raw) return null;
  try {
    const rec = JSON.parse(raw) as Partial<EcpRecord>;
    if (!rec.state) rec.state = "ECP_CREATED"; // backward-compat with v1 records
    return rec as EcpRecord;
  } catch {
    return null;
  }
}

export function allEcps(): EcpRecord[] {
  return listEcpFiles()
    .map((f) => getEcp(f.replace(/\.json$/, "")))
    .filter((e): e is EcpRecord => e !== null);
}

export function getLatestEcp(): EcpRecord | null {
  const files = listEcpFiles();
  if (!files.length) return null;
  return getEcp(files[files.length - 1].replace(/\.json$/, ""));
}

function nextEcpId(): string {
  let max = 0;
  for (const f of listEcpFiles()) {
    const n = Number(f.slice(4, 8));
    if (n > max) max = n;
  }
  return `ECP-${String(max + 1).padStart(4, "0")}`;
}

function writeEcp(ecp: EcpRecord) {
  ensureEcpDir();
  writeFileSync(join(ECP_DIR, `${ecp.id}.json`), JSON.stringify(ecp, null, 2) + "\n", "utf8");
}

export function setEcpState(id: string, state: EngState): EcpRecord | null {
  const ecp = getEcp(id);
  if (!ecp) return null;
  ecp.state = state;
  writeEcp(ecp);
  return ecp;
}

/* ---------------------------------------------------------------- timeline */

export function readTimeline(): TimelineEvent[] {
  const raw = readSafe(TIMELINE_FILE);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as TimelineEvent[];
  } catch {
    return [];
  }
}

export function addTimelineEvent(ev: TimelineEvent) {
  ensureEcpDir();
  const list = readTimeline();
  list.push(ev);
  writeFileSync(TIMELINE_FILE, JSON.stringify(list, null, 2) + "\n", "utf8");
}

/* --------------------------------------------------------------- 3R pointer */

export function readThreeR(): ThreeRPointer | null {
  const raw = readSafe(THREER_FILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ThreeRPointer;
  } catch {
    return null;
  }
}

export function writeThreeR(p: ThreeRPointer) {
  ensureEcpDir();
  writeFileSync(THREER_FILE, JSON.stringify(p, null, 2) + "\n", "utf8");
}

/** Latest 3R: prefer EngineeringOS pointer, then archived 3R doc, then git tags. */
export function getLatest3R(): { tag: string; source: string; pointer: ThreeRPointer | null } {
  const ptr = readThreeR();
  if (ptr) return { tag: ptr.tag, source: "engineeringos", pointer: ptr };
  const doc = readSafe(join(REPO_ROOT, "docs", "archive", "BACKUP-3R-POINT-FBOS4.md"));
  if (doc) {
    const tag = doc.match(/`(3r-[a-z0-9-]+)`/i);
    if (tag) return { tag: tag[1], source: "docs", pointer: null };
  }
  const tags = git(["tag", "--list", "3r-*"]).split("\n").filter(Boolean);
  if (tags.length) return { tag: tags[tags.length - 1], source: "git-tag", pointer: null };
  return { tag: "none", source: "none", pointer: null };
}

/* ----------------------------------------------------------------- config */

export type EngConfig = { autoPromote: boolean };

export function readConfig(): EngConfig {
  const raw = readSafe(CONFIG_FILE);
  if (raw) {
    try {
      return { autoPromote: true, ...(JSON.parse(raw) as Partial<EngConfig>) };
    } catch {
      /* fall through */
    }
  }
  return { autoPromote: true };
}

export function writeConfig(cfg: EngConfig) {
  ensureEcpDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2) + "\n", "utf8");
}

/* ------------------------------------------------------------- checkpoint */

export function createCheckpoint(): EcpRecord {
  const state = collectGitState();
  const ecp: EcpRecord = {
    id: nextEcpId(),
    type: "engineering-checkpoint",
    version: 2,
    createdAt: new Date().toISOString(),
    state: "ECP_CREATED",
    repository: state.repository,
    branch: state.branch,
    commit: state.commit,
    commitShort: state.commitShort,
    lastCommitMessage: state.lastCommitMessage,
    gitClean: state.gitClean,
    gitStatus: state.gitStatus,
    sprint: getCurrentSprint(),
  };
  writeEcp(ecp);
  addTimelineEvent({
    ts: ecp.createdAt,
    type: "ECP_CREATED",
    ecp: ecp.id,
    detail: `Checkpoint created at ${ecp.commitShort} on ${ecp.branch}`,
  });
  return ecp;
}

/* ----------------------------------------------------- doc marker helper */

const MARKERS = {
  ecp: ["<!-- ECP:LATEST -->", "<!-- /ECP:LATEST -->"],
  threeR: ["<!-- 3R:LATEST -->", "<!-- /3R:LATEST -->"],
} as const;

export function updateDocMarker(
  relativePath: string,
  marker: keyof typeof MARKERS,
  heading: string,
  line: string
) {
  const path = join(REPO_ROOT, relativePath);
  const [begin, end] = MARKERS[marker];
  const block = `${begin}\n**${line}**\n${end}`;
  const existing = readSafe(path);
  if (existing === null) return;
  let next: string;
  if (existing.includes(begin) && existing.includes(end)) {
    next = existing.replace(new RegExp(`${begin}[\\s\\S]*?${end}`), block);
  } else {
    next = existing.trimEnd() + `\n\n## ${heading}\n${block}\n`;
  }
  writeFileSync(path, next, "utf8");
}

/* ----------------------------------------------------- dashboard payload */

export type EngineeringInfo = ReturnType<typeof getEngineeringInfo>;

export function getEngineeringInfo() {
  const state = collectGitState();
  const latestEcp = getLatestEcp();
  const threeR = getLatest3R();
  const cfg = readConfig();
  return {
    ...state,
    sprint: getCurrentSprint(),
    latestEcp,
    latest3R: threeR.tag,
    latest3RSource: threeR.source,
    latest3RPointer: threeR.pointer,
    automationEnabled: cfg.autoPromote,
    timeline: readTimeline().slice(-20).reverse(),
    ecps: allEcps()
      .map((e) => ({ id: e.id, state: e.state, createdAt: e.createdAt, commitShort: e.commitShort }))
      .reverse(),
  };
}
