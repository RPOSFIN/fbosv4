import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  findRepoRoot,
  getFileInfo,
  isMainModule,
  runGit,
  writeJsonFile,
} from "./config";

export interface RepositoryState {
  generatedAt: string;
  repoRoot: string;
  isGitRepository: boolean;
  branch: string;
  gitClean: boolean;
  gitStatus: string[];
  lastCommit: {
    hash: string;
    shortHash: string;
    message: string;
    authorDate: string;
  };
  importantFiles: ReturnType<typeof getFileInfo>[];
}

export function getRepositoryState(repoRoot = findRepoRoot()): RepositoryState {
  const statusRaw = runGit(["status", "--porcelain"], repoRoot);
  const gitStatus = statusRaw ? statusRaw.split(/\r?\n/).filter(Boolean) : [];

  const importantFiles = [
    "AGENTS.md",
    "ENGINEERINGOS.ID",
    "ENGINEERINGOS.json",
    "AI_CAPABILITY_MATRIX.md",
    "ENGINEERING_CONSTITUTION.md",
    "package.json",
    "tsconfig.json",
    "ecp/timeline.json",
    "ecp/3r.json",
    "lib/engineering/ecp.ts",
    "lib/engineering/gates.ts",
    "lib/engineering/promotion.ts",
    "engineeringos/kernel/bootstrap.ts",
    "engineeringos/kernel/runtime.ts",
  ].map((fileName) => getFileInfo(join(repoRoot, fileName), repoRoot));

  return {
    generatedAt: new Date().toISOString(),
    repoRoot,
    isGitRepository: existsSync(join(repoRoot, ".git")),
    branch: runGit(["branch", "--show-current"], repoRoot) || "unknown",
    gitClean: gitStatus.length === 0,
    gitStatus,
    lastCommit: {
      hash: runGit(["rev-parse", "HEAD"], repoRoot) || "unknown",
      shortHash: runGit(["rev-parse", "--short", "HEAD"], repoRoot) || "unknown",
      message: runGit(["log", "-1", "--pretty=%s"], repoRoot) || "unknown",
      authorDate: runGit(["log", "-1", "--pretty=%aI"], repoRoot) || "unknown",
    },
    importantFiles,
  };
}

if (isMainModule(import.meta.url)) {
  const state = getRepositoryState();
  writeJsonFile("engineeringos/reports/repository-state.json", state);
  console.log(JSON.stringify(state, null, 2));
}
