import {
  addTimelineEvent,
  allEcps,
  collectGitState,
  getEcp,
  getLatestEcp,
  git,
  readConfig,
  readThreeR,
  setEcpState,
  updateDocMarker,
  writeThreeR,
} from "@/lib/engineering/ecp";
import { runGates } from "@/lib/engineering/gates";
import type {
  EcpRecord,
  EngState,
  ThreeRPointer,
  VerificationResult,
} from "@/lib/engineering/types";

/** Derive the engineering state for an ECP from gate results. */
export function deriveState(gates: VerificationResult): EngState {
  const by = (n: string) => gates.gates.find((g) => g.name === n)?.status === "PASS";
  if (!by("build")) return "DEVELOPMENT";
  if (!by("runtime")) return "BUILD_PASS";
  if (gates.allPass) return "READY_FOR_3R";
  return "RUNTIME_PASS";
}

export type VerifyResult = {
  ecp: EcpRecord | null;
  gates: VerificationResult;
  state: EngState | null;
  promotion: ThreeRPointer | null;
  promotionBlocked: boolean;
  blockReason?: string;
  mode: "auto" | "manual";
  message: string;
};

/**
 * Run verification gates against the latest ECP, advance its state, and — when
 * automation is enabled and every gate passes — auto-promote it to 3R.
 * SAFETY: never promotes when any gate fails (Phase 7).
 */
export async function verifyLatest(origin: string): Promise<VerifyResult> {
  const ecp = getLatestEcp();
  const gates = await runGates(origin);

  if (!ecp) {
    return {
      ecp: null,
      gates,
      state: null,
      promotion: null,
      promotionBlocked: true,
      blockReason: "No ECP exists — create a checkpoint first",
      mode: "auto",
      message: "No ECP to verify",
    };
  }

  const state = deriveState(gates);
  setEcpState(ecp.id, state);
  addTimelineEvent({
    ts: new Date().toISOString(),
    type: "VERIFIED",
    ecp: ecp.id,
    detail: gates.allPass ? "All gates PASS" : `Gates FAIL: ${gates.failed.join(", ")}`,
  });

  if (!gates.allPass) {
    addTimelineEvent({
      ts: new Date().toISOString(),
      type: "PROMOTION_BLOCKED",
      ecp: ecp.id,
      detail: `Safety hold — failing gate(s): ${gates.failed.join(", ")}`,
    });
    return {
      ecp: getEcp(ecp.id),
      gates,
      state,
      promotion: null,
      promotionBlocked: true,
      blockReason: `Failing gate(s): ${gates.failed.join(", ")}`,
      mode: "auto",
      message: `Verification incomplete — ${ecp.id} held in ${state}. No promotion.`,
    };
  }

  const cfg = readConfig();
  if (!cfg.autoPromote) {
    return {
      ecp: getEcp(ecp.id),
      gates,
      state,
      promotion: null,
      promotionBlocked: false,
      mode: "auto",
      message: `All gates PASS. ${ecp.id} is READY_FOR_3R. Automation disabled — use manual Promote.`,
    };
  }

  const pointer = doPromote(ecp.id, "auto");
  return {
    ecp: getEcp(ecp.id),
    gates,
    state: "PROMOTED_TO_3R",
    promotion: pointer,
    promotionBlocked: false,
    mode: "auto",
    message: `All gates PASS — ${ecp.id} auto-promoted to 3R (${pointer.tag}).`,
  };
}

/**
 * Manual promotion of the latest ECP. Enforces the SAME safety gates as auto
 * mode (Phase 4: manual === auto final result; Phase 7: no promotion on FAIL).
 */
export async function promoteLatestManual(origin: string): Promise<VerifyResult> {
  const ecp = getLatestEcp();
  const gates = await runGates(origin);

  if (!ecp) {
    return {
      ecp: null, gates, state: null, promotion: null, promotionBlocked: true,
      blockReason: "No ECP exists", mode: "manual", message: "No ECP to promote",
    };
  }

  const state = deriveState(gates);
  setEcpState(ecp.id, state);

  if (!gates.allPass) {
    addTimelineEvent({
      ts: new Date().toISOString(),
      type: "PROMOTION_BLOCKED",
      ecp: ecp.id,
      detail: `Manual promotion refused — failing gate(s): ${gates.failed.join(", ")}`,
    });
    return {
      ecp: getEcp(ecp.id), gates, state, promotion: null, promotionBlocked: true,
      blockReason: `Failing gate(s): ${gates.failed.join(", ")}`,
      mode: "manual",
      message: `Manual promotion refused (safety) — ${ecp.id} held in ${state}.`,
    };
  }

  const pointer = doPromote(ecp.id, "manual");
  return {
    ecp: getEcp(ecp.id), gates, state: "PROMOTED_TO_3R", promotion: pointer,
    promotionBlocked: false, mode: "manual",
    message: `${ecp.id} manually promoted to 3R (${pointer.tag}).`,
  };
}

/** Perform the actual 3R promotion: local git tag + pointer + docs + timeline + states. */
function doPromote(ecpId: string, mode: "auto" | "manual"): ThreeRPointer {
  const state = collectGitState();
  const date = new Date();
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const baseTag = `3r-fbos4-${stamp}-${ecpId.toLowerCase()}`;
  // Ensure tag uniqueness without force.
  const existing = git(["tag", "--list", `${baseTag}*`]).split("\n").filter(Boolean);
  const tag = existing.length ? `${baseTag}-${date.getTime().toString().slice(-4)}` : baseTag;

  // Local annotated tag only (no push from the engine — git stays source of truth).
  git(["tag", "-a", tag, "-m", `EngineeringOS 3R promotion of ${ecpId} (${mode})`]);

  const pointer: ThreeRPointer = {
    tag,
    ecp: ecpId,
    commit: state.commit,
    commitShort: state.commitShort,
    branch: state.branch,
    promotedAt: date.toISOString(),
    mode,
  };
  writeThreeR(pointer);

  // Mark previously-promoted ECPs as CLOSED, promote this one.
  for (const e of allEcps()) {
    if (e.id !== ecpId && e.state === "PROMOTED_TO_3R") setEcpState(e.id, "CLOSED");
  }
  setEcpState(ecpId, "PROMOTED_TO_3R");

  const line3r = `Latest 3R: ${tag} — ${ecpId} — ${pointer.branch} @ ${pointer.commitShort} — ${pointer.promotedAt} (${mode})`;
  updateDocMarker("docs/02_PROJECT_STATUS.md", "threeR", "Latest 3R (EngineeringOS)", line3r);
  updateDocMarker("docs/03_HANDOFF.md", "threeR", "Latest 3R (EngineeringOS)", line3r);

  addTimelineEvent({
    ts: pointer.promotedAt,
    type: "PROMOTED_TO_3R",
    ecp: ecpId,
    detail: `Promoted to 3R as ${tag} (${mode}) at ${pointer.commitShort}`,
  });

  return pointer;
}

/* --------------------------------------------------------------- restore */

export type RestoreResult = {
  ok: boolean;
  target: string;
  commit: string;
  recoveryBranch: string;
  checkoutCommand: string;
  message: string;
};

/**
 * Manual recovery. Creates a non-destructive recovery branch at the target
 * (latest 3R tag, or a specific ECP's commit) without touching the working tree.
 * EngineeringOS manages the git recovery so developers need not memorise commands.
 */
export function restore(target: "latest-3r" | string): RestoreResult {
  let commit = "";
  let label = target;

  if (target === "latest-3r") {
    const ptr = readThreeR();
    if (ptr?.commit) {
      commit = ptr.commit;
      label = ptr.tag;
    }
  } else {
    const ecp = getEcp(target);
    if (ecp) {
      commit = ecp.commit;
      label = ecp.id;
    }
  }

  if (!commit) {
    return {
      ok: false, target, commit: "", recoveryBranch: "", checkoutCommand: "",
      message: `Cannot restore: target "${target}" not found`,
    };
  }

  const recoveryBranch = `recovery/${label.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-${Date.now().toString().slice(-6)}`;
  // Non-destructive: create a branch pointer at the target commit; do not switch.
  git(["branch", recoveryBranch, commit]);

  const checkoutCommand = `git checkout ${recoveryBranch}`;
  addTimelineEvent({
    ts: new Date().toISOString(),
    type: "RESTORE",
    detail: `Recovery branch ${recoveryBranch} created at ${commit.slice(0, 7)} (target: ${label})`,
  });

  return {
    ok: true,
    target: label,
    commit,
    recoveryBranch,
    checkoutCommand,
    message: `Recovery branch created at ${commit.slice(0, 7)}. Run: ${checkoutCommand}`,
  };
}
