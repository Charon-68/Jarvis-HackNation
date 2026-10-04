/**
 * P1-20 — Person 1 Golden Flow Integration Test Suite
 * End-to-end integration test executing the complete Person 1 Acceptance Test lifecycle:
 *
 *   Start Expert Session
 *   → Capture & Ticket Triage (T001 → T002 → T003 → T005 → T006)
 *   → Pause/Resume lifecycle verification (pause stops frame processing)
 *   → ScreenEvent generation & activity stream emission
 *   → End Expert Task → Debrief phase transition & Teach-Back confirmation
 *   → Work Map synthesis & step evidence verification
 *   → Start Training Session (Unseen Case T007)
 *   → Pre-Save Evaluation Gate: Wrong initial attempt (P3/Support/Normal) BLOCKED
 *   → TutorIntervention validation (critical severity, data-loss guardrail, step evidence link)
 *   → Corrected decision re-evaluation (P1/Engineering/STOP) ALLOWED
 *   → Final Training Results screen verification
 */

import { mockApi, mockVoiceAgent } from "../mocks/mockServices";
import { DefaultScreenCaptureController } from "../capture/ScreenCaptureController";
import { MockVisionAdapter } from "../adapters/visionAdapter";
import { FramePipeline } from "../capture/framePipeline";
import { getExpertSequenceTickets, TRAINING_CASE } from "../data/ticketRepository";
import type {
  Session,
  ScreenEvent,
  WorkMap,
  DecisionAttempt,
  DecisionEvaluationResult,
  TrainingResult,
} from "../types/index";

declare const process: { argv?: string[]; exit?: (code: number) => void } | undefined;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function createMockMediaStream() {
  let trackEndedListener: (() => void) | null = null;
  let trackStopped = false;

  const mockTrack = {
    readyState: "live",
    stop: () => {
      trackStopped = true;
    },
    addEventListener: (event: string, listener: () => void) => {
      if (event === "ended") trackEndedListener = listener;
    },
    removeEventListener: (event: string, listener: () => void) => {
      if (event === "ended" && trackEndedListener === listener) {
        trackEndedListener = null;
      }
    },
  } as unknown as MediaStreamTrack;

  const mockStream = {
    getVideoTracks: () => [mockTrack],
    getTracks: () => [mockTrack],
  } as unknown as MediaStream;

  return {
    mockStream,
    mockTrack,
    isTrackStopped: () => trackStopped,
    triggerEnded: () => {
      if (trackEndedListener) (trackEndedListener as () => void)();
    },
  };
}

async function runGoldenFlowIntegrationTest() {
  console.log("=================================================================");
  console.log("🚀 STARTING PERSON 1 GOLDEN FLOW INTEGRATION TEST SUITE");
  console.log("=================================================================\n");

  // -------------------------------------------------------------------------
  // Step 1: Start Expert Session
  // -------------------------------------------------------------------------
  console.log("Step 1: Starting Expert Capture Session...");
  const expertSession: Session = await mockApi.createSession({
    mode: "expert",
    expertName: "Jane Triage Expert",
  });

  assert(expertSession.id !== undefined, "Expert session ID must be generated");
  assert(expertSession.mode === "expert", "Session mode must be 'expert'");
  assert(expertSession.phase === "capturing", "Initial expert phase must be 'capturing'");
  console.log(`  ✓ Expert Session initialized (ID: ${expertSession.id})\n`);

  // -------------------------------------------------------------------------
  // Step 2: Initialize ScreenCaptureController, VisionAdapter, & FramePipeline
  // -------------------------------------------------------------------------
  console.log("Step 2: Initializing Screen Capture & Vision Frame Pipeline...");
  const { mockStream, isTrackStopped } = createMockMediaStream();
  let sampledFramesCount = 0;

  const captureController = new DefaultScreenCaptureController({
    sampleIntervalMs: 50,
    getDisplayMediaFn: async () => mockStream,
  });

  captureController.onFrame(() => sampledFramesCount++);

  const mockVisionAdapter = new MockVisionAdapter();
  const screenEventsCaptured: ScreenEvent[] = [];

  const pipeline = new FramePipeline({
    sessionId: expertSession.id,
    captureController,
    visionAdapter: mockVisionAdapter,
    onScreenEvent: (evt) => screenEventsCaptured.push(evt),
  });

  pipeline.start();
  await captureController.start();
  assert(captureController.getStatus() === "active", "Capture status should be 'active'");
  console.log("  ✓ Screen Capture & Pipeline active\n");

  // -------------------------------------------------------------------------
  // Step 3: Perform Canonical Expert Ticket Sequence (T001 → T002 → T003 → T005 → T006)
  // -------------------------------------------------------------------------
  console.log("Step 3: Processing Canonical Expert Triage Sequence (T001 → T006)...");
  const expertTickets = getExpertSequenceTickets();
  assert(expertTickets.length === 5, "Expert sequence must contain 5 tickets");

  for (const ticket of expertTickets) {
    // Open Ticket ScreenEvent
    const openEvent: ScreenEvent = {
      id: `evt_open_${ticket.id}`,
      sessionId: expertSession.id,
      timestampMs: Date.now(),
      ticketId: ticket.id,
      type: "ticket_opened",
      description: `Opened ${ticket.id}: ${ticket.issue}`,
      source: "workflow_state",
    };
    screenEventsCaptured.push(openEvent);
    await mockVoiceAgent.sendScreenEvent(openEvent);

    // Save Decision ScreenEvent
    const saveEvent: ScreenEvent = {
      id: `evt_save_${ticket.id}`,
      sessionId: expertSession.id,
      timestampMs: Date.now(),
      ticketId: ticket.id,
      type: "decision_saved",
      description: `Saved triage for ${ticket.id} (${ticket.priority} · ${ticket.team} · ${ticket.action})`,
      newValue: ticket.action,
      source: "workflow_state",
    };
    screenEventsCaptured.push(saveEvent);
    await mockVoiceAgent.sendScreenEvent(saveEvent);
  }

  assert(screenEventsCaptured.length === 10, "Should have captured 10 workflow ScreenEvents (open + save x 5)");
  console.log(`  ✓ Successfully triaged 5 tickets and emitted ${screenEventsCaptured.length} ScreenEvents\n`);

  // -------------------------------------------------------------------------
  // Step 4: Verify Pause stops frame processing while preserving stream
  // -------------------------------------------------------------------------
  console.log("Step 4: Testing Pause & Resume capture controls...");
  captureController.grabFrame();
  const prePauseFrames = sampledFramesCount;
  assert(prePauseFrames > 0, "Should have sampled frames while active");

  captureController.pause();
  assert(captureController.getStatus() === "paused", "Capture status must be 'paused'");
  assert(isTrackStopped() === false, "Video track must NOT be stopped during pause");

  captureController.grabFrame();
  assert(sampledFramesCount === prePauseFrames, "Frame sampling MUST stop while paused");

  captureController.resume();
  assert(captureController.getStatus() === "active", "Capture status must return to 'active' on resume");
  console.log("  ✓ Pause verified: halted frame sampling while preserving stream & session\n");

  // -------------------------------------------------------------------------
  // Step 5: Stop Capture & End Expert Task → Transition to Debrief Phase
  // -------------------------------------------------------------------------
  console.log("Step 5: Ending Expert Task → Transitioning to Debrief phase...");
  pipeline.stop();
  captureController.stop();
  assert(captureController.getStatus() === "stopped", "Capture status must be 'stopped'");

  const debriefSession = await mockApi.endSession(expertSession.id, "debrief");
  assert(debriefSession.phase === "debrief", "Session phase must transition to 'debrief'");
  console.log("  ✓ Session transitioned to 'debrief' phase\n");

  // -------------------------------------------------------------------------
  // Step 6: Debrief & Work Map Synthesis
  // -------------------------------------------------------------------------
  console.log("Step 6: Generating Work Map from Expert Capture & Teach-Back...");
  const generatedWorkMap: WorkMap = await mockApi.generateWorkMap(expertSession.id);

  assert(generatedWorkMap !== null, "Generated Work Map must not be null");
  assert(generatedWorkMap.steps.length === 5, "Work Map must contain 5 learned steps");
  assert(generatedWorkMap.confirmedByExpert === true, "Work Map must carry teach-back confirmation");

  const dataLossStep = generatedWorkMap.steps.find((s) => s.ticketId === "T003");
  assert(dataLossStep !== undefined, "Work Map must contain T003 data-loss step");
  assert(dataLossStep!.screenshotRef !== undefined, "Data-loss step must contain screenshotRef evidence");
  console.log(`  ✓ Work Map synthesized (${generatedWorkMap.steps.length} steps, Expert Confirmed: ${generatedWorkMap.confirmedByExpert})\n`);

  // -------------------------------------------------------------------------
  // Step 7: Start New-Hire Training Session (Unseen Case T007)
  // -------------------------------------------------------------------------
  console.log("Step 7: Initializing New Hire Training Workspace (Unseen Case T007)...");
  const trainingSession: Session = await mockApi.createSession({
    mode: "training",
    traineeName: "Alex Trainee",
  });

  assert(trainingSession.mode === "training", "Training session mode must be 'training'");
  assert(trainingSession.phase === "training", "Training session initial phase must be 'training'");

  const unseenCase = TRAINING_CASE;
  assert(unseenCase.id === "T007", "Unseen case ID must be T007");
  console.log(`  ✓ Training Session initialized for unseen case "${unseenCase.issue}"\n`);

  // -------------------------------------------------------------------------
  // Step 8: Pre-Save Evaluation Gate — Wrong Attempt BLOCKED
  // -------------------------------------------------------------------------
  console.log("Step 8: Pre-Save Evaluation Gate — Submitting canonical wrong attempt (P3/Support/Normal)...");
  const wrongAttempt: DecisionAttempt = {
    id: "attempt_wrong_01",
    sessionId: trainingSession.id,
    ticketId: unseenCase.id,
    timestampMs: Date.now(),
    priority: "P3",
    team: "Support",
    action: "Normal troubleshooting",
    submitted: true,
  };

  const wrongEvalResult: DecisionEvaluationResult = await mockApi.evaluateDecision(
    wrongAttempt,
    generatedWorkMap,
  );

  assert(wrongEvalResult.allowSave === false, "PRE-SAVE GATE CRITICAL: allowSave MUST be false for wrong attempt");
  assert(wrongEvalResult.intervention !== null, "TutorIntervention MUST be returned when save is blocked");
  assert(wrongEvalResult.intervention!.severity === "critical", "Intervention severity MUST be 'critical'");
  assert(
    wrongEvalResult.intervention!.guardrail?.includes("data loss") === true,
    "Intervention guardrail must highlight data-loss rule",
  );
  assert(
    wrongEvalResult.intervention!.expertEvidence?.workMapStepId === "step_003",
    "Intervention expert evidence link must point to step_003",
  );
  console.log("  ✓ Pre-Save Evaluation Gate correctly BLOCKED unsafe decision & generated TutorIntervention\n");

  // -------------------------------------------------------------------------
  // Step 9: Pre-Save Evaluation Gate — Corrected Decision ALLOWED
  // -------------------------------------------------------------------------
  console.log("Step 9: Correcting decision (P1/Engineering/STOP normal processing + escalate)...");
  const correctedAttempt: DecisionAttempt = {
    id: "attempt_corrected_01",
    sessionId: trainingSession.id,
    ticketId: unseenCase.id,
    timestampMs: Date.now(),
    priority: "P1",
    team: "Engineering",
    action: "STOP normal processing + escalate",
    submitted: true,
  };

  const correctedEvalResult: DecisionEvaluationResult = await mockApi.evaluateDecision(
    correctedAttempt,
    generatedWorkMap,
  );

  assert(correctedEvalResult.allowSave === true, "allowSave MUST be true for correct decision");
  assert(correctedEvalResult.intervention === null, "Intervention MUST be null when save is allowed");
  console.log("  ✓ Pre-Save Evaluation Gate ALLOWED corrected decision\n");

  // -------------------------------------------------------------------------
  // Step 10: Save Training Results
  // -------------------------------------------------------------------------
  console.log("Step 10: Saving Training Results & Verifying Result Summary...");
  const trainingResultInput: TrainingResult = {
    id: "tr_result_01",
    sessionId: trainingSession.id,
    initialDecision: {
      priority: wrongAttempt.priority,
      team: wrongAttempt.team,
      action: wrongAttempt.action,
    },
    interventionOccurred: true,
    initialDecisionWrong: true,
    correctionOccurred: true,
    finalDecision: {
      priority: correctedAttempt.priority,
      team: correctedAttempt.team,
      action: correctedAttempt.action,
    },
    completed: true,
    timestampMs: Date.now(),
  };

  const savedResult = await mockApi.saveTrainingResult(trainingResultInput);

  assert(savedResult.completed === true, "Training result must be marked completed");
  assert(savedResult.initialDecisionWrong === true, "Result must record that initial decision was wrong");
  assert(savedResult.correctionOccurred === true, "Result must record that correction occurred");
  assert(savedResult.finalDecision.action === "STOP normal processing + escalate", "Final decision action must match");
  console.log("  ✓ Training result persisted successfully\n");

  console.log("=================================================================");
  console.log("🎉 ALL PERSON 1 GOLDEN FLOW INTEGRATION TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================================");
}

if (typeof process !== "undefined" && process?.argv && process?.argv[1]?.includes("integration")) {
  runGoldenFlowIntegrationTest().catch((err) => {
    console.error("❌ Golden Flow Integration Test FAILED:", err);
    process?.exit?.(1);
  });
}

export { runGoldenFlowIntegrationTest };
