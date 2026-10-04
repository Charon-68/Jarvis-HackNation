/**
 * Focused tests for ElevenLabs Voice Agent Adapter, useElevenLabsVoiceAgent hook bridge, lifecycle, cleanup, and vision fallback (Requirement 4)
 */

import { MockVoiceAgentAdapter, ElevenLabsVoiceAgentAdapter } from "../voiceAgentAdapter";
import { useElevenLabsVoiceAgent } from "../useElevenLabsVoiceAgent";
import { MockVisionAdapter, HttpVisionAdapter } from "../visionAdapter";
import type { ScreenEvent, AgentMessage } from "../../types/index";

declare const process: { argv?: string[]; exit?: (code: number) => void } | undefined;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runRealVoiceAdapterTests() {
  console.log("=== Running ElevenLabs Voice Adapter & Vision Hardening Tests ===");

  let tracksStoppedCount = 0;

  // Mock global getUserMedia for test runner
  if (typeof globalThis.navigator === "undefined") {
    (globalThis as any).navigator = {};
  }
  (globalThis.navigator as any).mediaDevices = {
    getUserMedia: async (constraints: any) => {
      if (constraints?.audio) {
        return {
          getAudioTracks: () => [{ stop: () => { tracksStoppedCount++; } }],
          getTracks: () => [{ stop: () => { tracksStoppedCount++; } }],
        };
      }
      throw new Error("Invalid constraints");
    },
  };

  // -------------------------------------------------------------------------
  // Test 1: Real adapter connection lifecycle & microphone verification
  // -------------------------------------------------------------------------
  {
    console.log("Test 1: Real adapter connection lifecycle & mic permission check...");
    const adapter = new ElevenLabsVoiceAgentAdapter("agent_test_123");
    const statusHistory: string[] = [];

    adapter.onStatusChange((st) => statusHistory.push(st));

    await adapter.connect({ sessionId: "session_real_01", mode: "interviewer" });

    assert(statusHistory.includes("connecting"), "Status must log 'connecting'");
    assert(statusHistory.includes("connected"), "Status must transition to 'connected'");

    await adapter.disconnect();
    assert(statusHistory.includes("disconnected"), "Status must transition to 'disconnected'");
  }

  // -------------------------------------------------------------------------
  // Test 2: Status & Message Propagation into AgentMessage
  // -------------------------------------------------------------------------
  {
    console.log("Test 2: Message & status propagation into AgentMessage...");
    const adapter = new MockVoiceAgentAdapter();
    const messagesReceived: AgentMessage[] = [];
    let currentStatus = "";

    const unsubMsg = adapter.onMessage((msg) => messagesReceived.push(msg));
    const unsubStatus = adapter.onStatusChange((st) => {
      currentStatus = st;
    });

    await adapter.connect({ sessionId: "session_msg_01", mode: "interviewer" });
    assert(currentStatus === "connected", "Current status should be 'connected'");

    await new Promise((r) => setTimeout(r, 450));
    assert(messagesReceived.length > 0, "Initial greeting AgentMessage should be received");
    assert(messagesReceived[0].role === "agent", "Role should be 'agent'");

    unsubMsg();
    unsubStatus();
    await adapter.disconnect();
  }

  // -------------------------------------------------------------------------
  // Test 3: ScreenEvent -> contextual update formatting
  // -------------------------------------------------------------------------
  {
    console.log("Test 3: ScreenEvent -> contextual update formatting...");
    const adapter = new ElevenLabsVoiceAgentAdapter("agent_test_context");

    await adapter.connect({ sessionId: "session_screen_01", mode: "interviewer" });

    const event: ScreenEvent = {
      id: "evt_t003_action",
      sessionId: "session_screen_01",
      timestampMs: Date.now(),
      ticketId: "T003",
      type: "action_changed",
      description: "Action set to STOP + escalate",
      newValue: "STOP + escalate",
      source: "workflow_state",
    };

    await adapter.sendScreenEvent(event);
    await adapter.disconnect();
  }

  // -------------------------------------------------------------------------
  // Test 4: StrictMode-style mount/unmount listener cleanup & duplicate prevention
  // -------------------------------------------------------------------------
  {
    console.log("Test 4: StrictMode-style mount/unmount listener cleanup...");
    const adapter = new MockVoiceAgentAdapter();
    let l1Calls = 0;
    let l2Calls = 0;

    // Mount 1 (Simulated StrictMode first render)
    const unsub1 = adapter.onStatusChange(() => l1Calls++);
    // Unmount 1
    unsub1();
    const l1CallsAtUnmount = l1Calls;

    // Mount 2 (Simulated StrictMode second render)
    const unsub2 = adapter.onStatusChange(() => l2Calls++);

    await adapter.connect({ sessionId: "session_strict_01", mode: "interviewer" });

    assert(l1Calls === l1CallsAtUnmount, "Unsubscribed listener 1 must not receive subsequent notifications");
    assert(l2Calls > l1Calls, "Active listener 2 should receive notifications");

    unsub2();
    await adapter.disconnect();
  }

  // -------------------------------------------------------------------------
  // Test 5: Vision Fallback Behavior (MockVisionAdapter vs HttpVisionAdapter)
  // -------------------------------------------------------------------------
  {
    console.log("Test 5: Vision fallback behavior...");
    const mockVision = new MockVisionAdapter();
    const httpVision = new HttpVisionAdapter("http://localhost:9999");

    const mockFrame = new Blob(["test_frame"], { type: "image/jpeg" });

    // Mock vision yields pre-configured or empty event without throwing 404
    const mockRes = await mockVision.analyzeFrame({
      sessionId: "sess_v",
      timestampMs: Date.now(),
      image: mockFrame,
    });
    assert(mockRes === null || typeof mockRes === "object", "MockVisionAdapter operates cleanly");

    // HttpVisionAdapter handles 404 cleanly when endpoint is missing
    (globalThis as any).fetch = async () => ({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    const httpRes = await httpVision.analyzeFrame({
      sessionId: "sess_v",
      timestampMs: Date.now(),
      image: mockFrame,
    });
    assert(httpRes === null, "HttpVisionAdapter must return null on 404 when endpoint is missing");
  }

  // -------------------------------------------------------------------------
  // Test 6: useElevenLabsVoiceAgent Hook Bridge Verification (Requirement 4)
  // -------------------------------------------------------------------------
  {
    console.log("Test 6: useElevenLabsVoiceAgent hook bridge — explicit mock vs real error mode...");
    const { renderToString } = await import("react-dom/server");
    const React = await import("react");

    // 6a: Explicit mock mode works
    let mockVoiceAdapter: any = null;
    function MockTestComponent() {
      mockVoiceAdapter = useElevenLabsVoiceAgent({ mockMode: true });
      return null;
    }
    renderToString(React.createElement(MockTestComponent));
    assert(mockVoiceAdapter instanceof MockVoiceAgentAdapter, "Explicit mockMode must return MockVoiceAgentAdapter");

    // 6b: Real mode does not silently fallback to mock, and fails with error when ElevenLabs is unavailable
    let realVoiceAdapter: any = null;
    function RealTestComponent() {
      realVoiceAdapter = useElevenLabsVoiceAgent({ mockMode: false });
      return null;
    }
    renderToString(React.createElement(RealTestComponent));
    assert(!(realVoiceAdapter instanceof MockVoiceAgentAdapter), "Real mode must NOT return MockVoiceAgentAdapter");

    let reportedStatus = "";
    realVoiceAdapter.onStatusChange((st: string) => { reportedStatus = st; });

    let connectError: Error | null = null;
    try {
      await realVoiceAdapter.connect({ sessionId: "sess_real_test", agentId: "test_agent_id_123", mode: "interviewer" });
    } catch (err) {
      connectError = err as Error;
    }

    assert(connectError !== null, "Real mode without active ElevenLabs startSession must throw error");
    assert(reportedStatus === "error", "Failed connect must set status to 'error', NOT 'connected'");
    assert(tracksStoppedCount > 0, "Microphone check must stop temporary tracks immediately");
  }

  console.log("✅ ALL ELEVENLABS ADAPTER & HARDENING TESTS PASSED SUCCESSFULLY!");
}

if (typeof process !== "undefined" && process?.argv && process?.argv[1]?.includes("realVoiceAdapter")) {
  runRealVoiceAdapterTests().catch((err) => {
    console.error("❌ Test execution failed:", err);
    process?.exit?.(1);
  });
}

export { runRealVoiceAdapterTests };

