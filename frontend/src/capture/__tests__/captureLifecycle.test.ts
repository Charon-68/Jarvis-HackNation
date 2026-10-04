/**
 * Focused tests for ScreenCaptureController lifecycle and frame sampling (P1-05 & P1-06)
 */

import { DefaultScreenCaptureController } from "../ScreenCaptureController";
import { MockVisionAdapter } from "../../adapters/visionAdapter";
import { FramePipeline } from "../framePipeline";
import type { ScreenEvent, CaptureState } from "../../types/index";

declare const process: { argv?: string[]; exit?: (code: number) => void } | undefined;

// Simple test assertion helper
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

async function runTests() {
  console.log("=== Running Capture Lifecycle & Frame Sampling Tests ===");

  // -------------------------------------------------------------------------
  // Test 1: Start capture transitions to active
  // -------------------------------------------------------------------------
  {
    console.log("Test 1: Start capture transitions to active...");
    const { mockStream } = createMockMediaStream();
    const stateLog: CaptureState[] = [];
    const controller = new DefaultScreenCaptureController({
      sampleIntervalMs: 100,
      getDisplayMediaFn: async () => mockStream,
    });

    controller.onStatusChange((st) => stateLog.push(st));

    assert(controller.getStatus() === "idle", "Initial status should be idle");
    await controller.start();

    assert(controller.getStatus() === "active", "Status should be active after start");
    assert(stateLog.some((s) => s.status === "requesting"), "Should have logged requesting state");
    assert(stateLog.some((s) => s.status === "active"), "Should have logged active state");

    controller.stop();
  }

  // -------------------------------------------------------------------------
  // Test 2: Permission denied / Cancellation error handling
  // -------------------------------------------------------------------------
  {
    console.log("Test 2: Permission denied / Cancellation error handling...");
    const errorGetDisplayMedia = async () => {
      const err = new Error("Permission denied by user");
      err.name = "NotAllowedError";
      throw err;
    };

    const controller = new DefaultScreenCaptureController({
      getDisplayMediaFn: errorGetDisplayMedia,
    });

    let caught = false;
    try {
      await controller.start();
    } catch (e: unknown) {
      caught = true;
      assert((e as Error).message.includes("denied"), "Error message should mention denied");
    }

    assert(caught, "Should throw error on permission rejection");
    assert(controller.getStatus() === "error", "Status should be error");
    assert(
      (controller.getCaptureState().error || "").includes("denied"),
      "CaptureState error field should describe permission denial",
    );
  }

  // -------------------------------------------------------------------------
  // Test 3: Pause stops frame processing while preserving session & stream
  // -------------------------------------------------------------------------
  {
    console.log("Test 3: Pause stops frame processing while preserving stream...");
    const { mockStream, isTrackStopped } = createMockMediaStream();
    let frameCount = 0;
    const controller = new DefaultScreenCaptureController({
      sampleIntervalMs: 50,
      getDisplayMediaFn: async () => mockStream,
    });

    controller.onFrame(() => frameCount++);
    await controller.start();

    // Trigger frame manually to verify
    controller.grabFrame();
    const activeFrameCount = frameCount;
    assert(activeFrameCount > 0, "Should have received frames when active");

    controller.pause();
    assert(controller.getStatus() === "paused", "Status should be paused");
    assert(isTrackStopped() === false, "Video track must NOT be stopped when paused");

    // Attempt grab while paused
    controller.grabFrame();
    assert(frameCount === activeFrameCount, "Frame count should not increment while paused");

    controller.resume();
    assert(controller.getStatus() === "active", "Status should return to active after resume");

    controller.stop();
    assert(controller.getStatus() === "stopped", "Status should be stopped");
    assert(isTrackStopped() === true, "Track should be stopped after explicit controller.stop()");
  }

  // -------------------------------------------------------------------------
  // Test 4: Unexpected stream end handling
  // -------------------------------------------------------------------------
  {
    console.log("Test 4: Unexpected stream end handling...");
    const { mockStream, triggerEnded } = createMockMediaStream();
    const controller = new DefaultScreenCaptureController({
      sampleIntervalMs: 100,
      getDisplayMediaFn: async () => mockStream,
    });

    await controller.start();
    assert(controller.getStatus() === "active", "Should be active");

    // Simulate browser / track end event
    triggerEnded();

    assert(controller.getStatus() === "stopped", "Status should transition to stopped when track ends");
    assert(
      (controller.getCaptureState().error || "").includes("stopped"),
      "Error should indicate stream was stopped by browser/user",
    );
  }

  // -------------------------------------------------------------------------
  // Test 5: VisionAdapter handoff & FramePipeline
  // -------------------------------------------------------------------------
  {
    console.log("Test 5: VisionAdapter handoff & FramePipeline integration...");
    const { mockStream } = createMockMediaStream();
    const mockScreenEvent: ScreenEvent = {
      id: "evt_vision_01",
      sessionId: "session_test",
      timestampMs: Date.now(),
      ticketId: "T003",
      type: "action_changed",
      description: "Action changed to STOP + escalate",
      source: "vision",
    };

    const mockVisionAdapter = new MockVisionAdapter([mockScreenEvent]);
    const controller = new DefaultScreenCaptureController({
      sampleIntervalMs: 50,
      getDisplayMediaFn: async () => mockStream,
    });

    const receivedEvents: ScreenEvent[] = [];

    const pipeline = new FramePipeline({
      sessionId: "session_test",
      captureController: controller,
      visionAdapter: mockVisionAdapter,
      onScreenEvent: (evt) => receivedEvents.push(evt),
    });

    pipeline.start();
    await controller.start();

    // Grab frame to pass through pipeline
    controller.grabFrame();

    // Wait briefly for async vision adapter promise
    await new Promise((r) => setTimeout(r, 100));

    assert(mockVisionAdapter.analyzedFramesCount > 0, "Vision adapter should have received sampled frame");
    assert(receivedEvents.length === 1, "Pipeline should have emitted ScreenEvent from vision adapter");
    assert(receivedEvents[0].ticketId === "T003", "Emitted ScreenEvent ticketId should match");

    pipeline.stop();
    controller.stop();
  }

  console.log("✅ ALL CAPTURE LIFECYCLE & FRAME SAMPLING TESTS PASSED SUCCESSFULLY!");
}

// Execute tests if executed directly via node or test runner
if (typeof process !== "undefined" && process?.argv && process?.argv[1]?.includes("captureLifecycle")) {
  runTests().catch((err) => {
    console.error("Test execution failed:", err);
    process?.exit?.(1);
  });
}

export { runTests };
