/**
 * Focused unit tests for Pre-Save Evaluation Gate and Tutor Intervention (P1-14, P1-15, P1-16)
 */

import { mockApi } from "../../mocks/mockServices";
import type { DecisionAttempt, WorkMap } from "../../types/index";

declare const process: { argv?: string[]; exit?: (code: number) => void } | undefined;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log("=== Running Evaluation Gate & Tutor Intervention Tests ===");

  const session = await mockApi.createSession({ mode: "training" });
  const workMap: WorkMap = await mockApi.generateWorkMap(session.id);

  // -------------------------------------------------------------------------
  // Test 1: Canonical wrong attempt (P3 / Support / Normal troubleshooting) is blocked
  // -------------------------------------------------------------------------
  {
    console.log("Test 1: Canonical wrong attempt (P3 / Support / Normal troubleshooting) is blocked...");
    const wrongAttempt: DecisionAttempt = {
      id: "attempt_wrong_01",
      sessionId: session.id,
      ticketId: "T007",
      timestampMs: Date.now(),
      priority: "Low Priority",
      team: "Customer Support",
      action: "Follow Standard Procedure",
      submitted: true,
    };

    const evalResult = await mockApi.evaluateDecision(wrongAttempt, workMap);

    assert(evalResult.allowSave === false, "allowSave MUST be false for wrong attempt on data-loss case");
    assert(evalResult.intervention !== null, "TutorIntervention must be returned when save is blocked");
    assert(evalResult.intervention!.severity === "critical", "Data loss violation severity must be critical");
    assert(
      evalResult.intervention!.guardrail?.includes("data loss") === true,
      "Intervention must include data loss guardrail",
    );
    assert(
      evalResult.intervention!.expertEvidence?.workMapStepId === "step_003",
      "Intervention must link to expert step evidence (step_003)",
    );
  }

  // -------------------------------------------------------------------------
  // Test 2: Correct attempt (Emergency / Engineering / Escalate Immediately) is allowed
  // -------------------------------------------------------------------------
  {
    console.log("Test 2: Correct attempt is allowed to save...");
    const correctAttempt: DecisionAttempt = {
      id: "attempt_correct_01",
      sessionId: session.id,
      ticketId: "T007",
      timestampMs: Date.now(),
      priority: "Emergency",
      team: "Engineering",
      action: "Escalate Immediately",
      submitted: true,
    };

    const evalResult = await mockApi.evaluateDecision(correctAttempt, workMap);

    assert(evalResult.allowSave === true, "allowSave MUST be true for correct triage decision");
    assert(evalResult.intervention === null, "Intervention must be null when save is allowed");
  }

  console.log("✅ ALL EVALUATION GATE & TUTOR INTERVENTION TESTS PASSED SUCCESSFULLY!");
}

if (typeof process !== "undefined" && process?.argv && process?.argv[1]?.includes("evaluationGate")) {
  runTests().catch((err) => {
    console.error("Test execution failed:", err);
    process?.exit?.(1);
  });
}

export { runTests };
