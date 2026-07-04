export type LifecycleState = "INIT" | "BOOTING" | "READY" | "STOPPED" | "FAILED";

export type RuntimeLifecycleState = "idle" | "booting" | "ready" | "failed";

export type EngineeringOSStatus = "PASS" | "PARTIAL" | "FAIL";

export interface ValidationCheck {
  name: string;
  status: EngineeringOSStatus;
  detail: string;
}

export interface KernelConfig {
  name: string;
  version: string;
  environment: "development" | "production" | "test" | "unknown";
  repoRoot: string;
  engineeringOSRoot: string;
  kernelRoot: string;
  reportsRoot: string;
  requiredKernelFiles: string[];
  requiredPackageScripts: string[];
}

export interface BootstrapResult {
  status: EngineeringOSStatus;
  state: LifecycleState;
  startedAt: string;
  completedAt: string;
  repoRoot: string;
  engineeringOSRoot: string;
  config: KernelConfig;
  checks: ValidationCheck[];
  errors: string[];
}

export interface RuntimeState {
  lifecycle: RuntimeLifecycleState;
  startedAt: string | null;
  stoppedAt: string | null;
  lastError: string | null;
  bootstrap: BootstrapResult | null;
}

export interface ModuleRegistry {
  registerModule(name: string, module: unknown): void;
  getModule(name: string): unknown;
}
