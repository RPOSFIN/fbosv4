import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import {
  dirname,
  join,
  relative,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";
import type { KernelConfig } from "./types";

type PackageJson = {
  scripts?: Record<string, string>;
};

type EngineeringOSJson = {
  project?: string;
  version?: string;
};

export const SPRINT_IDS = [
  "E02",
  "E03",
  "E04",
  "E05",
  "E06",
  "E07",
  "E08",
  "E09",
  "E10",
  "E11",
  "E12",
] as const;

export const REQUIRED_KERNEL_FILES = [
  "bootstrap.ts",
  "logger.ts",
  "config.ts",
  "index.ts",
  "runtime.ts",
  "context-loader.ts",
  "resume-engine.ts",
  "validation-engine.ts",
  "task-engine.ts",
  "repository-integration.ts",
  "supabase-integration.ts",
  "dashboard-data.ts",
  "automation-engine.ts",
  "production-package.ts",
] as const;

export const REQUIRED_PACKAGE_SCRIPTS = [
  "build",
  "db:verify",
  "engineeringos:validate",
  "engineeringos:resume",
  "engineeringos:dashboard",
  "engineeringos:package",
] as const;

export function findRepoRoot(startPath = process.cwd()): string {
  let current = resolve(startPath);

  while (true) {
    const hasPackage = existsSync(join(current, "package.json"));
    const hasIdentity = existsSync(join(current, "ENGINEERINGOS.ID"));

    if (hasPackage && hasIdentity) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      return resolve(startPath);
    }

    current = parent;
  }
}

export function getEngineeringOSRoot(repoRoot = findRepoRoot()): string {
  return join(repoRoot, "engineeringos");
}

export function getKernelRoot(repoRoot = findRepoRoot()): string {
  return join(getEngineeringOSRoot(repoRoot), "kernel");
}

export function getReportsRoot(repoRoot = findRepoRoot()): string {
  return join(getEngineeringOSRoot(repoRoot), "reports");
}

export function ensureDirectory(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export function ensureReportsRoot(repoRoot = findRepoRoot()): string {
  const reportsRoot = getReportsRoot(repoRoot);
  ensureDirectory(reportsRoot);
  return reportsRoot;
}

export function safeReadText(filePath: string): string | null {
  try {
    const buffer = readFileSync(filePath);

    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      return buffer.toString("utf16le").slice(1);
    }

    if (buffer.length >= 2 && buffer[0] !== 0x00 && buffer[1] === 0x00) {
      return buffer.toString("utf16le");
    }

    return buffer.toString("utf8");
  } catch {
    return null;
  }
}

export function readJsonFile<T>(filePath: string): T | null {
  const raw = safeReadText(filePath);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJsonFile(filePath: string, value: unknown): void {
  ensureDirectory(dirname(filePath));
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeTextFile(filePath: string, value: string): void {
  ensureDirectory(dirname(filePath));
  writeFileSync(filePath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

export function listFilesRecursive(root: string, extensions?: string[]): string[] {
  if (!existsSync(root)) {
    return [];
  }

  const skipped = new Set([".git", ".next", "node_modules"]);
  const files: string[] = [];

  function walk(current: string): void {
    const entries = readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(current, entry.name);

      if (entry.isDirectory()) {
        if (skipped.has(entry.name) || /^engineeringos_repair_backup_/i.test(entry.name)) {
          continue;
        }

        walk(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (extensions && !extensions.some((extension) => entry.name.endsWith(extension))) {
        continue;
      }

      files.push(fullPath);
    }
  }

  walk(root);
  return files.sort();
}

export function toRepoRelative(filePath: string, repoRoot = findRepoRoot()): string {
  return relative(repoRoot, filePath).replace(/\\/g, "/");
}

export function getPackageScripts(repoRoot = findRepoRoot()): Record<string, string> {
  const packageJson = readJsonFile<PackageJson>(join(repoRoot, "package.json"));
  return packageJson?.scripts ?? {};
}

export function runGit(args: string[], repoRoot = findRepoRoot()): string {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      windowsHide: true,
    }).trim();
  } catch {
    return "";
  }
}

export function getFileInfo(filePath: string, repoRoot = findRepoRoot()) {
  if (!existsSync(filePath)) {
    return {
      path: toRepoRelative(filePath, repoRoot),
      exists: false,
      size: 0,
      modifiedAt: null as string | null,
    };
  }

  const stats = statSync(filePath);

  return {
    path: toRepoRelative(filePath, repoRoot),
    exists: true,
    size: stats.size,
    modifiedAt: stats.mtime.toISOString(),
  };
}

export function loadEngineeringOSConfig(repoRoot = findRepoRoot()): KernelConfig {
  const engineeringConfig = readJsonFile<EngineeringOSJson>(join(repoRoot, "ENGINEERINGOS.json"));
  const environment = process.env.NODE_ENV;

  return {
    name: engineeringConfig?.project ?? "EngineeringOS Kernel",
    version: engineeringConfig?.version ?? "2.0",
    environment:
      environment === "development" || environment === "production" || environment === "test"
        ? environment
        : "unknown",
    repoRoot,
    engineeringOSRoot: getEngineeringOSRoot(repoRoot),
    kernelRoot: getKernelRoot(repoRoot),
    reportsRoot: ensureReportsRoot(repoRoot),
    requiredKernelFiles: [...REQUIRED_KERNEL_FILES],
    requiredPackageScripts: [...REQUIRED_PACKAGE_SCRIPTS],
  };
}

export function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function isMainModule(moduleUrl: string): boolean {
  if (!process.argv[1]) {
    return false;
  }

  try {
    return resolve(fileURLToPath(moduleUrl)) === resolve(process.argv[1]);
  } catch {
    return false;
  }
}

export const config = loadEngineeringOSConfig();
