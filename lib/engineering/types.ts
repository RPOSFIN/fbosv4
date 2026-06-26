/** EngineeringOS Phase 2 — shared types for the Recovery Engine. */

export const ENG_STATES = [
  "ECP_CREATED",
  "DEVELOPMENT",
  "BUILD_PASS",
  "RUNTIME_PASS",
  "VERIFICATION_PASS",
  "READY_FOR_3R",
  "PROMOTED_TO_3R",
  "CLOSED",
] as const;

export type EngState = (typeof ENG_STATES)[number];

export type GateName =
  | "build"
  | "runtime"
  | "api"
  | "database"
  | "route"
  | "console";

export type GateStatus = "PASS" | "FAIL";

export type GateResult = {
  name: GateName;
  status: GateStatus;
  detail: string;
};

export type GitState = {
  repository: string;
  branch: string;
  commit: string;
  commitShort: string;
  lastCommitMessage: string;
  gitClean: boolean;
  gitStatus: string[];
};

export type EcpRecord = {
  id: string;
  type: "engineering-checkpoint";
  version: 2;
  createdAt: string;
  state: EngState;
  repository: string;
  branch: string;
  commit: string;
  commitShort: string;
  lastCommitMessage: string;
  gitClean: boolean;
  gitStatus: string[];
  sprint: string;
};

export type ThreeRPointer = {
  tag: string;
  ecp: string;
  commit: string;
  commitShort: string;
  branch: string;
  promotedAt: string;
  mode: "auto" | "manual";
};

export type TimelineEvent = {
  ts: string;
  type:
    | "ECP_CREATED"
    | "VERIFIED"
    | "PROMOTION_BLOCKED"
    | "PROMOTED_TO_3R"
    | "RESTORE";
  ecp?: string;
  detail: string;
};

export type VerificationResult = {
  gates: GateResult[];
  allPass: boolean;
  failed: GateName[];
};
