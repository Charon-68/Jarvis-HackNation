/**
 * Focused unit tests for WorkMap loading, rendering, and evidence replay (P1-11, P1-12, P1-13)
 */

import { mockApi } from "../../mocks/mockServices";
import type { WorkMap, WorkMapStep } from "../../types/index";

declare const process: { argv?: string[]; exit?: (code: number) => void } | undefined;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log("=== Running WorkMap & Evidence Replay Tests ===");

  // -------------------------------------------------------------------------
  // Test 1: Generate WorkMap via MockApprenticeApi
  // -------------------------------------------------------------------------
  {
    console.log("Test 1: Generate WorkMap via MockApprenticeApi...");
    const session = await mockApi.createSession({ mode: "expert", expertName: "Jane Expert" });
    const workMap: WorkMap = await mockApi.generateWorkMap(session.id);

    assert(workMap !== null && workMap !== undefined, "Generated WorkMap must not be null");
    assert(workMap.steps.length > 0, "Generated WorkMap must contain steps");
    assert(workMap.confirmedByExpert === true, "WorkMap should carry teach-back confirmation");
    assert(workMap.expertName === "Jane Expert", "WorkMap should record expert name");
  }

  // -------------------------------------------------------------------------
  // Test 2: Verify step cards properties (observedAction, decision, reasoning, evidence)
  // -------------------------------------------------------------------------
  {
    console.log("Test 2: Verify step card properties & evidence references...");
    const session = await mockApi.createSession({ mode: "expert" });
    const workMap = await mockApi.generateWorkMap(session.id);

    const step3 = workMap.steps.find((s) => s.ticketId === "T003");
    assert(step3 !== undefined, "WorkMap step for T003 should exist");

    assert(step3!.observedAction.includes("T003"), "Step should contain observedAction");
    assert(step3!.decision.includes("STOP"), "Step should contain decision");
    assert(step3!.expertReason.length > 0, "Step should contain expertReason");
    assert(step3!.guardrails.length > 0, "Step should contain guardrails");
    assert(step3!.teachingPoint.length > 0, "Step should contain teachingPoint");
    assert(step3!.screenshotRef !== undefined, "Step should contain screenshotRef evidence link");
  }

  console.log("✅ ALL WORKMAP & EVIDENCE REPLAY TESTS PASSED SUCCESSFULLY!");
}

if (typeof process !== "undefined" && process?.argv && process?.argv[1]?.includes("workMap")) {
  runTests().catch((err) => {
    console.error("Test execution failed:", err);
    process?.exit?.(1);
  });
}

export { runTests };
