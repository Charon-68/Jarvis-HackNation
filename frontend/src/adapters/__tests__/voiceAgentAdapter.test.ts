/**
 * Focused tests for VoiceAgentAdapter and ScreenEvent timeline processing (P1-07, P1-08, P1-09)
 */

import { MockVoiceAgentAdapter, ElevenLabsVoiceAgentAdapter } from "../voiceAgentAdapter";
import type { ScreenEvent, AgentMessage } from "../../types/index";

declare const process: { argv?: string[]; exit?: (code: number) => void } | undefined;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log("=== Running Voice Agent Adapter & ScreenEvent Timeline Tests ===");

  // -------------------------------------------------------------------------
  // Test 1: MockVoiceAgentAdapter connect & disconnect lifecycle
  // -------------------------------------------------------------------------
  {
    console.log("Test 1: MockVoiceAgentAdapter connect & disconnect lifecycle...");
    const adapter = new MockVoiceAgentAdapter();
    const statusLog: string[] = [];
    const messageLog: AgentMessage[] = [];

    adapter.onStatusChange((status) => statusLog.push(status));
    adapter.onMessage((msg) => messageLog.push(msg));

    await adapter.connect({ sessionId: "test_session_01", mode: "interviewer" });
    assert(statusLog.includes("connected"), "Status should transition to connected");

    // Wait for greeting message
    await new Promise((r) => setTimeout(r, 500));
    assert(messageLog.length > 0, "Initial greeting message should be emitted");
    assert(messageLog[0].role === "agent", "Greeting role should be agent");

    await adapter.disconnect();
    assert(statusLog.includes("disconnected"), "Status should transition to disconnected");
  }

  // -------------------------------------------------------------------------
  // Test 2: ScreenEvent dispatch triggers agent question
  // -------------------------------------------------------------------------
  {
    console.log("Test 2: ScreenEvent dispatch triggers agent question...");
    const adapter = new MockVoiceAgentAdapter();
    const messages: AgentMessage[] = [];

    adapter.onMessage((msg) => messages.push(msg));
    await adapter.connect({ sessionId: "test_session_02", mode: "interviewer" });

    const event: ScreenEvent = {
      id: "evt_t003_save",
      sessionId: "test_session_02",
      timestampMs: Date.now(),
      ticketId: "T003",
      type: "decision_saved",
      description: "Saved triage decision for T003",
    };

    await adapter.sendScreenEvent(event);

    // Wait for mock question delay
    await new Promise((r) => setTimeout(r, 950));
    const questionMsg = messages.find((m) => m.kind === "question");

    assert(questionMsg !== undefined, "A question AgentMessage should be emitted for T003 decision");
    assert(questionMsg!.relatedEventId === "evt_t003_save", "Question message should link to the related ScreenEvent ID");
  }

  // -------------------------------------------------------------------------
  // Test 3: ElevenLabsVoiceAgentAdapter provider neutrality
  // -------------------------------------------------------------------------
  {
    console.log("Test 3: ElevenLabsVoiceAgentAdapter provider neutrality...");
    const adapter = new ElevenLabsVoiceAgentAdapter("agent_test_id");
    let currentStatus = "";

    adapter.onStatusChange((st) => {
      currentStatus = st;
    });

    await adapter.connect({ sessionId: "live_test_01", mode: "interviewer" });
    assert(currentStatus === "connected", "Live adapter should transition to connected");

    await adapter.sendScreenEvent({
      id: "evt_01",
      sessionId: "live_test_01",
      timestampMs: Date.now(),
      ticketId: "T001",
      type: "priority_changed",
      description: "Priority changed to P1",
      newValue: "P1",
    });

    await adapter.disconnect();
    assert(currentStatus === "disconnected", "Live adapter should disconnect cleanly");
  }

  console.log("✅ ALL VOICE AGENT ADAPTER TESTS PASSED SUCCESSFULLY!");
}

if (typeof process !== "undefined" && process?.argv && process?.argv[1]?.includes("voiceAgentAdapter")) {
  runTests().catch((err) => {
    console.error("Test execution failed:", err);
    process?.exit?.(1);
  });
}

export { runTests };
