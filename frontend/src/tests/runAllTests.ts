/**
 * Test Runner Entrypoint — Executes all frontend unit and integration test suites
 */

import { runRealVoiceAdapterTests } from "../adapters/__tests__/realVoiceAdapter.test";
import { runTests as runCaptureLifecycleTests } from "../capture/__tests__/captureLifecycle.test";
import { runTests as runEvaluationGateTests } from "../screens/__tests__/evaluationGate.test";
import { runTests as runWorkMapTests } from "../screens/__tests__/workMap.test";
import { runTests as runApprenticeApiTests } from "../adapters/__tests__/apprenticeApi.test";
import { runTests as runTicketPersistenceTests } from "../screens/__tests__/ticketPersistence.test";
import { runGoldenFlowIntegrationTest } from "./integration.test";

async function runAll() {
  console.log("=================================================================");
  console.log("🧪 RUNNING ALL FRONTEND SUITES");
  console.log("=================================================================\n");

  await runRealVoiceAdapterTests();
  await runCaptureLifecycleTests();
  await runEvaluationGateTests();
  await runTicketPersistenceTests();
  await runWorkMapTests();
  await runApprenticeApiTests();
  await runGoldenFlowIntegrationTest();

  console.log("\n=================================================================");
  console.log("🎉 ALL FRONTEND SUITES PASSED SUCCESSFULLY!");
  console.log("=================================================================");
}

declare const process: { exit?: (code: number) => void } | undefined;

runAll().catch((err) => {
  console.error("❌ Frontend test runner failed:", err);
  process?.exit?.(1);
});
