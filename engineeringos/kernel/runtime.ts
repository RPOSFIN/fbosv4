import { bootstrapEngineeringOS } from "./bootstrap";
import { isMainModule, normalizeError, writeJsonFile } from "./config";
import type { RuntimeState } from "./types";

const runtimeState: RuntimeState = {
  lifecycle: "idle",
  startedAt: null,
  stoppedAt: null,
  lastError: null,
  bootstrap: null,
};

export async function startRuntime(): Promise<RuntimeState> {
  if (runtimeState.lifecycle === "ready" || runtimeState.lifecycle === "booting") {
    return getRuntimeStatus();
  }

  runtimeState.lifecycle = "booting";
  runtimeState.startedAt = new Date().toISOString();
  runtimeState.stoppedAt = null;
  runtimeState.lastError = null;

  try {
    const bootstrap = bootstrapEngineeringOS();
    runtimeState.bootstrap = bootstrap;
    runtimeState.lifecycle = bootstrap.status === "PASS" ? "ready" : "failed";
    runtimeState.lastError = bootstrap.errors.length ? bootstrap.errors.join("; ") : null;
  } catch (error) {
    runtimeState.lifecycle = "failed";
    runtimeState.lastError = normalizeError(error);
  }

  writeJsonFile("engineeringos/reports/runtime-status.json", runtimeState);
  return getRuntimeStatus();
}

export function stopRuntime(): RuntimeState {
  runtimeState.lifecycle = "idle";
  runtimeState.stoppedAt = new Date().toISOString();
  writeJsonFile("engineeringos/reports/runtime-status.json", runtimeState);
  return getRuntimeStatus();
}

export function getRuntimeStatus(): RuntimeState {
  return {
    lifecycle: runtimeState.lifecycle,
    startedAt: runtimeState.startedAt,
    stoppedAt: runtimeState.stoppedAt,
    lastError: runtimeState.lastError,
    bootstrap: runtimeState.bootstrap,
  };
}

if (isMainModule(import.meta.url)) {
  startRuntime()
    .then((status) => {
      console.log(JSON.stringify(status, null, 2));
      process.exitCode = status.lifecycle === "ready" ? 0 : 1;
    })
    .catch((error: unknown) => {
      console.error(normalizeError(error));
      process.exitCode = 1;
    });
}
