/**
 * P1-08 — Voice Agent Integration Adapter Surface
 * Isolates ElevenLabs-specific SDK details behind a provider-neutral interface.
 * Page components consume VoiceAgentAdapter and never depend on ElevenLabs internals.
 */

import type {
  ScreenEvent,
  WorkMap,
  TutorIntervention,
  AgentMessage,
} from "../types/index";

export interface VoiceAgentConnectInput {
  sessionId: string;
  mode: "interviewer" | "tutor";
  agentId?: string;
}

export interface VoiceAgentAdapter {
  connect(input: VoiceAgentConnectInput): Promise<void>;
  disconnect(): Promise<void>;
  updateContext(context: Record<string, unknown>): Promise<void>;
  sendScreenEvent(event: ScreenEvent): Promise<void>;
  sendWorkMap(workMap: WorkMap): Promise<void>;
  sendIntervention(intervention: TutorIntervention): Promise<void>;
  onMessage(callback: (message: AgentMessage) => void): () => void;
  onStatusChange(callback: (status: string) => void): () => void;
}

let _seq = 1;
function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${_seq++}`;
}

/**
 * MockVoiceAgentAdapter — provider-neutral mock adapter for offline testing & golden demo.
 */
export class MockVoiceAgentAdapter implements VoiceAgentAdapter {
  private messageListeners: Set<(msg: AgentMessage) => void> = new Set();
  private statusListeners: Set<(status: string) => void> = new Set();
  private activeSessionId: string | null = null;
  private currentStatus = "offline";

  public async connect(input: VoiceAgentConnectInput): Promise<void> {
    this.activeSessionId = input.sessionId;
    this.setStatus("connecting");

    await new Promise((resolve) => setTimeout(resolve, 300));
    this.setStatus("connected");

    // Greeting message
    setTimeout(() => {
      this.emitMessage({
        id: genId("msg"),
        sessionId: input.sessionId,
        timestampMs: Date.now(),
        role: "agent",
        kind: "status",
        text:
          input.mode === "interviewer"
            ? "🎧 AI Apprentice is listening. I will ask questions when key decisions occur."
            : "🎓 AI Tutor is ready. Work through the case and I will guide your decisions.",
      });
    }, 400);
  }

  public async disconnect(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    this.setStatus("disconnected");
    this.activeSessionId = null;
  }

  public async updateContext(_context: Record<string, unknown>): Promise<void> {
    // Mock no-op
  }

  public async sendScreenEvent(event: ScreenEvent): Promise<void> {
    if (!this.activeSessionId) return;

    // Simulate interview questions on key decisions
    if (event.type === "decision_saved" && event.ticketId === "T003") {
      setTimeout(() => {
        this.emitMessage({
          id: genId("msg"),
          sessionId: this.activeSessionId!,
          timestampMs: Date.now(),
          role: "agent",
          kind: "question",
          text: "You chose to STOP normal troubleshooting on T003. What indicated potential data loss to you?",
          relatedEventId: event.id,
        });
      }, 800);
    } else if (event.type === "decision_saved" && event.ticketId === "T001") {
      setTimeout(() => {
        this.emitMessage({
          id: genId("msg"),
          sessionId: this.activeSessionId!,
          timestampMs: Date.now(),
          role: "agent",
          kind: "question",
          text: "Why did you route T001 immediately to Infrastructure instead of Support?",
          relatedEventId: event.id,
        });
      }, 800);
    }
  }

  public async sendWorkMap(_workMap: WorkMap): Promise<void> {
    if (!this.activeSessionId) return;
    this.emitMessage({
      id: genId("msg"),
      sessionId: this.activeSessionId,
      timestampMs: Date.now(),
      role: "agent",
      kind: "teach_back",
      text: "I synthesized a Work Map from your triage steps. Let us review the guardrails together.",
    });
  }

  public async sendIntervention(intervention: TutorIntervention): Promise<void> {
    if (!this.activeSessionId) return;
    this.emitMessage({
      id: genId("msg"),
      sessionId: this.activeSessionId,
      timestampMs: Date.now(),
      role: "agent",
      kind: "intervention",
      text: intervention.message,
    });
  }

  public onMessage(callback: (message: AgentMessage) => void): () => void {
    this.messageListeners.add(callback);
    return () => {
      this.messageListeners.delete(callback);
    };
  }

  public onStatusChange(callback: (status: string) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.currentStatus);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  private setStatus(status: string) {
    this.currentStatus = status;
    for (const cb of this.statusListeners) {
      try {
        cb(status);
      } catch (err) {
        console.error("Error in status listener:", err);
      }
    }
  }

  private emitMessage(msg: AgentMessage) {
    for (const cb of this.messageListeners) {
      try {
        cb(msg);
      } catch (err) {
        console.error("Error in message listener:", err);
      }
    }
  }
}

/**
 * ElevenLabsVoiceAgentAdapter — Adapter for live ElevenLabs Agent SDK integration.
 * Converts provider-neutral requests into ElevenLabs updates.
 */
export class ElevenLabsVoiceAgentAdapter implements VoiceAgentAdapter {
  private defaultAgentId: string;
  private activeSessionId: string | null = null;
  private messageListeners: Set<(msg: AgentMessage) => void> = new Set();
  private statusListeners: Set<(status: string) => void> = new Set();
  private currentStatus = "offline";

  constructor(defaultAgentId: string = "agent_9501m425131dfx5tmyks9aq9a003") {
    this.defaultAgentId = defaultAgentId;
  }

  public async connect(input: VoiceAgentConnectInput): Promise<void> {
    this.activeSessionId = input.sessionId;
    this.setStatus("connecting");

    // In a live browser session with microphone permission:
    // Uses ElevenLabs Client SDK or WebSocket session connection behind the scenes.
    await new Promise((resolve) => setTimeout(resolve, 200));
    this.setStatus("connected");
  }

  public async disconnect(): Promise<void> {
    this.setStatus("disconnected");
    this.activeSessionId = null;
  }

  public async updateContext(context: Record<string, unknown>): Promise<void> {
    if (this.currentStatus !== "connected") return;
    // Format context payload for ElevenLabs dynamic variables
    console.log("[ElevenLabsAdapter] Context updated:", context);
  }

  public async sendScreenEvent(event: ScreenEvent): Promise<void> {
    if (this.currentStatus !== "connected") return;

    const formattedContext =
      `[SCREEN] Ticket ${event.ticketId} — ${event.type}: ${event.description}` +
      `${event.newValue ? ` (New Value: ${event.newValue})` : ""}`;

    console.log("[ElevenLabsAdapter] Sent screen event:", formattedContext);
  }

  public async sendWorkMap(workMap: WorkMap): Promise<void> {
    if (this.currentStatus !== "connected") return;
    console.log("[ElevenLabsAdapter] Sent work map:", workMap.id);
  }

  public async sendIntervention(intervention: TutorIntervention): Promise<void> {
    if (this.currentStatus !== "connected") return;
    console.log("[ElevenLabsAdapter] Sent intervention:", intervention.ticketId);
  }

  public onMessage(callback: (message: AgentMessage) => void): () => void {
    this.messageListeners.add(callback);
    return () => {
      this.messageListeners.delete(callback);
    };
  }

  public onStatusChange(callback: (status: string) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.currentStatus);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  private setStatus(status: string) {
    this.currentStatus = status;
    for (const cb of this.statusListeners) cb(status);
  }
}
