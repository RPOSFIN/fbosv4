import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  isMainModule,
  loadEngineeringOSConfig,
  writeJsonFile,
} from "./config";
import { getKernelHealth } from "./health";
import { Logger } from "./logger";
import type {
  BootstrapResult,
  KernelConfig,
  LifecycleState,
  ValidationCheck,
} from "./types";

export class Kernel {
  private state: LifecycleState = "INIT";

  constructor(private readonly config: KernelConfig) {}

  async boot() {
    this.state = "BOOTING";
    Logger.info(`Booting ${this.config.name} v${this.config.version}...`);
    this.state = "READY";
    Logger.info("Kernel Ready.");
    return getKernelHealth(this.state);
  }

  getState() {
    return this.state;
  }
}

function buildCheck(name: string, pass: boolean, detail: string): ValidationCheck {
  return {
    name,
    status: pass ? "PASS" : "FAIL",
    detail,
  };
}

export function bootstrapEngineeringOS(repoRoot = process.cwd()): BootstrapResult {
  const startedAt = new Date().toISOString();
  const config = loadEngineeringOSConfig(repoRoot);

  Logger.info("Starting EngineeringOS bootstrap", {
    repoRoot: config.repoRoot,
  });

  const checks: ValidationCheck[] = [
    buildCheck(
      "repoRoot",
      existsSync(config.repoRoot),
      existsSync(config.repoRoot) ? "Repository root exists." : "Repository root is missing."
    ),
    buildCheck(
      "packageJson",
      existsSync(join(config.repoRoot, "package.json")),
      "package.json is required at repository root."
    ),
    buildCheck(
      "engineeringOSRoot",
      existsSync(config.engineeringOSRoot),
      "engineeringos folder is required."
    ),
    buildCheck(
      "kernelRoot",
      existsSync(config.kernelRoot),
      "engineeringos/kernel folder is required."
    ),
    buildCheck(
      "identity",
      existsSync(join(config.repoRoot, "ENGINEERINGOS.ID")) &&
        existsSync(join(config.repoRoot, "ENGINEERINGOS.json")),
      "EngineeringOS identity files are required."
    ),
  ];

  for (const fileName of ["bootstrap.ts", "logger.ts", "config.ts", "index.ts"]) {
    const filePath = join(config.kernelRoot, fileName);
    checks.push(
      buildCheck(`kernel:${fileName}`, existsSync(filePath), `${fileName} must exist in engineeringos/kernel.`)
    );
  }

  const errors = checks
    .filter((check) => check.status === "FAIL")
    .map((check) => `${check.name}: ${check.detail}`);

  const result: BootstrapResult = {
    status: errors.length === 0 ? "PASS" : "FAIL",
    state: errors.length === 0 ? "READY" : "FAILED",
    startedAt,
    completedAt: new Date().toISOString(),
    repoRoot: config.repoRoot,
    engineeringOSRoot: config.engineeringOSRoot,
    config,
    checks,
    errors,
  };

  writeJsonFile(join(config.reportsRoot, "bootstrap-result.json"), result);

  if (result.status === "PASS") {
    Logger.info("EngineeringOS bootstrap completed", { status: result.status });
  } else {
    Logger.error("EngineeringOS bootstrap failed", { errorCount: errors.length });
  }

  return result;
}

if (isMainModule(import.meta.url)) {
  const result = bootstrapEngineeringOS();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === "PASS" ? 0 : 1;
}
