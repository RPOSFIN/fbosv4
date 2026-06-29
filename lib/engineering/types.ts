// lib/engineering/types.ts

export type EngState =
  | "ECP_CREATED"
  | "DEVELOPMENT"
  | "BUILD_PASS"
  | "RUNTIME_PASS"
  | "VERIFICATION_PASS"
  | "READY_FOR_3R"
  | "PROMOTED_TO_3R"
  | "CLOSED";

export interface EcpRecord {
  id: string;
  type: "engineering-checkpoint";
  version: number;
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
}

export interface ThreeRPointer {
  tag: string;
  ecp: string;
  commit: string;
  commitShort: string;
  branch: string;
  promotedAt: string;
  mode: "auto" | "manual";
}

export interface TimelineEvent {
  ts: string;

  type:
    | "ECP_CREATED"
    | "VERIFIED"
    | "PROMOTION_BLOCKED"
    | "PROMOTED_TO_3R"
    | "RESTORE";

  detail: string;

  ecp?: string;
}

/* -------------------------------------------------- */
/* Verification */
/* -------------------------------------------------- */

export interface GateResult {
  name: string;
  status: "PASS" | "FAIL";
  detail: string;
}

export interface VerificationResult {
  gates: GateResult[];
  allPass: boolean;
  failed: string[];
}

/* -------------------------------------------------- */
/* Dashboard */
/* -------------------------------------------------- */

export interface EngineeringInfo {
  repository: string;
  branch: string;
  commit: string;
  commitShort: string;
  lastCommitMessage: string;
  gitClean: boolean;
  gitStatus: string[];
  sprint: string;

  latestEcp: EcpRecord | null;

  latest3R: string;
  latest3RSource: string;
  latest3RPointer: ThreeRPointer | null;

  automationEnabled: boolean;

  timeline: TimelineEvent[];

  ecps: Array<{
    id: string;
    state: EngState;
    createdAt: string;
    commitShort: string;
  }>;
}

export {};