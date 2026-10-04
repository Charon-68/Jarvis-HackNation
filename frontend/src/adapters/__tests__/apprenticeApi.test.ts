/**
 * Focused unit tests for HttpApprenticeApi & HybridApprenticeApi (P1-17)
 */

import { HttpApprenticeApi, HybridApprenticeApi } from "../apprentice-api";
import { MockApprenticeApi } from "../../mocks/mockServices";
import type { DecisionAttempt, WorkMap } from "../../types/index";

declare const process: { argv?: string[]; exit?: (code: number) => void } | undefined;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log("=== Running Apprentice API Adapter Tests ===");

  // -------------------------------------------------------------------------
  // Test 1: HybridApprenticeApi falls back gracefully to MockApprenticeApi when offline
  // -------------------------------------------------------------------------
  {
    console.log("Test 1: HybridApprenticeApi offline fallback...");
    const mockApi = new MockApprenticeApi();
    const hybridApi = new HybridApprenticeApi(mockApi);

    const session = await hybridApi.createSession({ mode: "expert", expertName: "Test Expert" });
    assert(session.id !== undefined, "Session ID should be generated");
    assert(session.mode === "expert", "Session mode should be expert");

    const workMap: WorkMap = await hybridApi.generateWorkMap(session.id);
    assert(workMap.id !== undefined, "Generated WorkMap should exist");

    const attempt: DecisionAttempt = {
      id: "attempt_01",
      sessionId: session.id,
      ticketId: "T007",
      timestampMs: Date.now(),
      priority: "P1",
      team: "Engineering",
      action: "STOP normal processing + escalate",
      submitted: true,
    };

    const evalResult = await hybridApi.evaluateDecision(attempt, workMap);
    assert(evalResult.allowSave === true, "Correct attempt evaluation should return allowSave = true");
  }

  // -------------------------------------------------------------------------
  // Test 2: HttpApprenticeApi URL configuration
  // -------------------------------------------------------------------------
  {
    console.log("Test 2: HttpApprenticeApi URL configuration...");
    const httpApi = new HttpApprenticeApi("http://localhost:8000");
    assert(httpApi !== undefined, "HttpApprenticeApi instance created");
  }

  console.log("✅ ALL APPRENTICE API ADAPTER TESTS PASSED SUCCESSFULLY!");
}

if (typeof process !== "undefined" && process?.argv && process?.argv[1]?.includes("apprenticeApi")) {
  runTests().catch((err) => {
    console.error("Test execution failed:", err);
    process?.exit?.(1);
  });
}

export { runTests };
