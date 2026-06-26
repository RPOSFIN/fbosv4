import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * EngineeringOS — ECP (Engineering Checkpoint) layer, v1 (LOCAL ONLY).
 *
 * This module collects local git/repo state and writes Engineering Checkpoint
 * JSON files under /ecp. It performs NO git automation (no commit/push/merge/tag)
 * and never touches the 3R layer. Checkpoints are local artifacts only.
 */

const REPO_ROOT = process.cwd();
const ECP_DIR = join(REPO_ROOT, "ecp");

export type EcpRecord = {
  id: string;
  type: "engineering-checkpoint";
  version: 1;
  createdAt: string;
  repository: string;
  branch: string;
  commit: string;
  commitShort: string;
  lastCommitMessage: string;
  gitClean: boolean;
  gitStatus: string[];
  sprint: string;
};

export type EngineeringInfo = {
  repository: string;
  branch: string;
  commit: string;
  commitShort: string;
  lastCommitMessage: string;
  gitClean: boolean;
  gitStatus: string[];
  sprint: string;
  lastEcp: EcpRecord | null;
  latest3R: string;
};

function git(args: string[]): string {
  try {
    return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

/** Parse `owner/repo` from the origin URL without leaking any embedded token. */
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

/** Best-effort current sprint from the engineering-memory docs. */
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

/** Best-effort latest 3R checkpoint identifier from archived 3R doc or git tags. */
export function getLatest3R(): string {
  const doc = readSafe(join(REPO_ROOT, "docs", "archive", "BACKUP-3R-POINT-FBOS4.md"));
  if (doc) {
    const tag = doc.match(/`(3r-[a-z0-9-]+)`/i);
    if (tag) return tag[1];
    const created = doc.match(/\*\*Created:\*\*\s*([0-9-]+)/i);
    if (created) return `3R ${created[1]}`;
  }
  const tags = git(["tag", "--list", "3r-*"]).split("\n").filter(Boolean);
  if (tags.length) return tags[tags.length - 1];
  return "none";
}

/** Read a text file, auto-decoding UTF-16LE (some engineering-memory docs use it). */
function readSafe(path: string): string | null {
  try {
    const buf = readFileSync(path);
    if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
      return buf.toString("utf16le").slice(1); // strip BOM
    }
    if (buf.length >= 2 && buf[0] !== 0x00 && buf[1] === 0x00) {
      return buf.toString("utf16le"); // BOM-less UTF-16LE (ASCII content)
    }
    return buf.toString("utf8");
  } catch {
    return null;
  }
}

function cleanInline(s: string): string {
  return s.replace(/[`*]/g, "").trim();
}

function ensureEcpDir() {
  if (!existsSync(ECP_DIR)) mkdirSync(ECP_DIR, { recursive: true });
}

function listEcpFiles(): string[] {
  if (!existsSync(ECP_DIR)) return [];
  return readdirSync(ECP_DIR)
    .filter((f) => /^ECP-\d{4}\.json$/.test(f))
    .sort();
}

export function getLatestEcp(): EcpRecord | null {
  const files = listEcpFiles();
  if (!files.length) return null;
  const latest = files[files.length - 1];
  const raw = readSafe(join(ECP_DIR, latest));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EcpRecord;
  } catch {
    return null;
  }
}

function nextEcpId(): string {
  const files = listEcpFiles();
  let max = 0;
  for (const f of files) {
    const n = Number(f.slice(4, 8));
    if (n > max) max = n;
  }
  return `ECP-${String(max + 1).padStart(4, "0")}`;
}

export function getEngineeringInfo(): EngineeringInfo {
  const state = collectGitState();
  return {
    ...state,
    sprint: getCurrentSprint(),
    lastEcp: getLatestEcp(),
    latest3R: getLatest3R(),
  };
}

/**
 * Create one Engineering Checkpoint. Writes /ecp/ECP-NNNN.json and refreshes the
 * "Last Engineering Checkpoint" marker in PROJECT_STATUS and HANDOFF. LOCAL ONLY —
 * no git commit/push/merge/tag, no 3R changes.
 */
export function createCheckpoint(): EcpRecord {
  const state = collectGitState();
  const ecp: EcpRecord = {
    id: nextEcpId(),
    type: "engineering-checkpoint",
    version: 1,
    createdAt: new Date().toISOString(),
    repository: state.repository,
    branch: state.branch,
    commit: state.commit,
    commitShort: state.commitShort,
    lastCommitMessage: state.lastCommitMessage,
    gitClean: state.gitClean,
    gitStatus: state.gitStatus,
    sprint: getCurrentSprint(),
  };

  ensureEcpDir();
  writeFileSync(join(ECP_DIR, `${ecp.id}.json`), JSON.stringify(ecp, null, 2) + "\n", "utf8");

  const marker = `Last Engineering Checkpoint: ${ecp.id} — ${ecp.createdAt} — ${ecp.branch} @ ${ecp.commitShort} (sprint: ${ecp.sprint})`;
  updateDocMarker(join(REPO_ROOT, "docs", "02_PROJECT_STATUS.md"), marker);
  updateDocMarker(join(REPO_ROOT, "docs", "03_HANDOFF.md"), marker);

  return ecp;
}

const BEGIN = "<!-- ECP:LATEST -->";
const END = "<!-- /ECP:LATEST -->";

/** Idempotently refresh the ECP marker block in a doc (append if absent). */
function updateDocMarker(path: string, line: string) {
  const block = `${BEGIN}\n**${line}**\n${END}`;
  const existing = readSafe(path);
  if (existing === null) return; // do not create docs that don't exist
  let next: string;
  if (existing.includes(BEGIN) && existing.includes(END)) {
    next = existing.replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}`), block);
  } else {
    next = existing.trimEnd() + `\n\n## Engineering Checkpoints (ECP)\n${block}\n`;
  }
  writeFileSync(path, next, "utf8");
}
