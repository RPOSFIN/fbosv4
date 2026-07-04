import type { LifecycleState } from "./types";

export const getKernelHealth = (state: LifecycleState) => ({
  version: "2.0",
  state,
  startupTimestamp: Date.now(),
});
