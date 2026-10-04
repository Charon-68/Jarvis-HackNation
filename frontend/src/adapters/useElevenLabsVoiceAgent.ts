/**
 * P1-08 — Real ElevenLabs Voice Agent Hook Bridge
 * Wraps @elevenlabs/react granular conversation controls & status hooks, exposing the provider-neutral VoiceAgentAdapter interface.
 */

import { useState, useRef, useMemo, useCallback } from "react";
import {
  useConversation,
  useConversationControls,
  useConversationStatus,
  useConversationMode,
} from "@elevenlabs/react";
import type {
  VoiceAgentAdapter,
  VoiceAgentConnectInput,
} from "./voiceAgentAdapter";
import { MockVoiceAgentAdapter } from "./voiceAgentAdapter";
import type {
  AgentMessage,
  ScreenEvent,
  WorkMap,
  TutorIntervention,
} from "../types/index";

import { getTicket } from "../data/ticketRepository";

let _msgId = 1;
function genMsgId(): string {
  return `msg_el_${Date.now()}_${_msgId++}`;
}

export interface UseElevenLabsVoiceAgentOptions {
  agentId?: string;
  mockMode?: boolean;
}

export function useElevenLabsVoiceAgent(
  opts?: UseElevenLabsVoiceAgentOptions
): VoiceAgentAdapter {
  const isMock =
    opts?.mockMode === true ||
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_USE_MOCK_VOICE === "true");

  const mockAdapterRef = useRef<MockVoiceAgentAdapter | null>(null);
  if (!mockAdapterRef.current) {
    mockAdapterRef.current = new MockVoiceAgentAdapter();
  }

  const [status, setStatus] = useState<string>("offline");
  const activeSessionIdRef = useRef<string | null>(null);
  const messageSubscribersRef = useRef<Set<(msg: AgentMessage) => void>>(new Set());
  const statusSubscribersRef = useRef<Set<(st: string) => void>>(new Set());

  const statusRef = useRef<string>(status);
  statusRef.current = status;

  const emitStatus = useCallback((newStatus: string) => {
    setStatus(newStatus);
    statusRef.current = newStatus;
    for (const cb of Array.from(statusSubscribersRef.current)) {
      try {
        cb(newStatus);
      } catch (e) {
        console.error("Error in voice status listener:", e);
      }
    }
  }, []);

  const emitMessage = useCallback((msg: AgentMessage) => {
    for (const cb of Array.from(messageSubscribersRef.current)) {
      try {
        cb(msg);
      } catch (e) {
        console.error("Error in voice message listener:", e);
      }
    }
  }, []);

  const emitStatusRef = useRef(emitStatus);
  emitStatusRef.current = emitStatus;

  const emitMessageRef = useRef(emitMessage);
  emitMessageRef.current = emitMessage;

  const clientTools = useMemo(() => {
    function parseParams(params: unknown): Record<string, any> {
      if (!params) return {};
      if (typeof params === "string") {
        try {
          return JSON.parse(params);
        } catch {
          return {};
        }
      }
      if (typeof params === "object") {
        return params as Record<string, any>;
      }
      return {};
    }

    const getTicketContextHandler = (rawParams: unknown) => {
      try {
        const params = parseParams(rawParams);
        const id = params.ticket_id || params.ticketId || params.id || "";
        const ticket = getTicket(id);
        console.log("[ElevenLabs Client Tool] get_ticket_context invoked:", id, ticket, rawParams);
        if (!ticket) {
          return JSON.stringify({ ticket_id: id, error: "Ticket not found" });
        }
        return JSON.stringify(ticket);
      } catch (err) {
        console.error("[ElevenLabs Client Tool] Error in get_ticket_context:", err);
        return JSON.stringify({ error: String(err) });
      }
    };

    const logExpertDecisionHandler = (rawParams: unknown) => {
      try {
        const params = parseParams(rawParams);
        const ticketId = params.ticket_id || params.ticketId || params.id || "";
        const actionTaken = params.action_taken || params.actionTaken || params.action || "";
        const rationale = params.decision_rationale || params.decisionRationale || params.rationale || "";
        const priority = params.priority || "";
        const team = params.team || "";

        console.log("[ElevenLabs Client Tool] log_expert_decision invoked:", { ticketId, actionTaken, rationale, priority, team, rawParams });

        const displayText = `📝 Logged Expert Decision for ${ticketId || "ticket"}: ${actionTaken || "Updated"}${rationale ? ` — "${rationale}"` : ""}`;
        emitMessageRef.current({
          id: genMsgId(),
          sessionId: activeSessionIdRef.current ?? "local",
          timestampMs: Date.now(),
          role: "agent",
          kind: "answer",
          text: displayText,
        });

        return JSON.stringify({
          status: "logged",
          ticket_id: ticketId,
          action_taken: actionTaken,
          decision_rationale: rationale,
          priority,
          team,
        });
      } catch (err) {
        console.error("[ElevenLabs Client Tool] Error in log_expert_decision:", err);
        return JSON.stringify({ status: "error", message: String(err) });
      }
    };

    const triggerDebriefSummaryHandler = (rawParams: unknown) => {
      try {
        const params = parseParams(rawParams);
        const sessId = params.session_id || params.sessionId || activeSessionIdRef.current || "";
        console.log("[ElevenLabs Client Tool] trigger_debrief_summary invoked:", params, rawParams);

        emitMessageRef.current({
          id: genMsgId(),
          sessionId: sessId,
          timestampMs: Date.now(),
          role: "agent",
          kind: "status",
          text: `📊 Triggering end-of-session debrief synthesis...`,
        });

        return JSON.stringify({
          status: "synthesis_started",
          session_id: sessId,
          tickets_processed: params.tickets_processed || 0,
        });
      } catch (err) {
        console.error("[ElevenLabs Client Tool] Error in trigger_debrief_summary:", err);
        return JSON.stringify({ status: "error", message: String(err) });
      }
    };

    return {
      log_expert_decision: logExpertDecisionHandler,
      logExpertDecision: logExpertDecisionHandler,
      log_decision: logExpertDecisionHandler,
      logDecision: logExpertDecisionHandler,
      expert_decision: logExpertDecisionHandler,
      expertDecision: logExpertDecisionHandler,
      get_ticket_context: getTicketContextHandler,
      getTicketContext: getTicketContextHandler,
      get_ticket: getTicketContextHandler,
      getTicket: getTicketContextHandler,
      trigger_debrief_summary: triggerDebriefSummaryHandler,
      triggerDebriefSummary: triggerDebriefSummaryHandler,
      debrief_summary: triggerDebriefSummaryHandler,
      debriefSummary: triggerDebriefSummaryHandler,
    };
  }, []);

  const clientToolsRef = useRef(clientTools);
  clientToolsRef.current = clientTools;

  // Granular ElevenLabs conversation hooks with registered client tools
  let conversation: ReturnType<typeof useConversation> | null = null;
  let controls: ReturnType<typeof useConversationControls> | null = null;
  let statusState: ReturnType<typeof useConversationStatus> | null = null;
  let modeState: ReturnType<typeof useConversationMode> | null = null;

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    conversation = useConversation({
      clientTools,
      onConnect: () => {
        emitStatusRef.current("connected");
      },
      onDisconnect: () => {
        emitStatusRef.current("disconnected");
        activeSessionIdRef.current = null;
      },
      onError: (err: unknown) => {
        const errorObj = err as Error;
        const errMsg = typeof err === "string" ? err : errorObj?.message || "ElevenLabs session error";
        emitStatusRef.current("error");
        emitMessageRef.current({
          id: genMsgId(),
          sessionId: activeSessionIdRef.current ?? "local",
          timestampMs: Date.now(),
          role: "agent",
          kind: "status",
          text: `⚠️ Voice Agent Error: ${errMsg}`,
        });
      },
      onMessage: (msgPayload: unknown) => {
        if (!msgPayload) return;
        const payload = msgPayload as { message?: string; text?: string; source?: string; role?: string };
        const text = payload.message || payload.text;
        if (!text) return;
        const role = payload.source === "user" || payload.role === "user" ? "user" : "agent";
        emitMessageRef.current({
          id: genMsgId(),
          sessionId: activeSessionIdRef.current ?? "local",
          timestampMs: Date.now(),
          role,
          kind: "question",
          text,
        });
      },
      onModeChange: (modeData: unknown) => {
        const modeObj = modeData as { mode?: string };
        const m = typeof modeData === "string" ? modeData : modeObj?.mode;
        if (m === "speaking" || m === "listening") {
          emitStatusRef.current(m);
        }
      },
    });
  } catch {
    conversation = null;
  }

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    controls = useConversationControls();
  } catch {
    controls = null;
  }

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    statusState = useConversationStatus();
  } catch {
    statusState = null;
  }

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    modeState = useConversationMode();
  } catch {
    modeState = null;
  }

  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;

  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  // Construct stable realAdapter instance (dependency array [] ensures referential stability across status/mode changes)
  const realAdapter: VoiceAgentAdapter = useMemo(() => {
    return {
      connect: async (input: VoiceAgentConnectInput): Promise<void> => {
        activeSessionIdRef.current = input.sessionId;
        emitStatusRef.current("connecting");

        // Microphone permission check: request permission then stop temporary tracks immediately
        if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (stream && stream.getTracks) {
              stream.getTracks().forEach((track) => track.stop());
            }
          } catch (micErr: unknown) {
            const errObj = micErr as Error;
            const userMsg =
              errObj?.name === "NotAllowedError" || errObj?.name === "PermissionDeniedError"
                ? "Microphone permission denied. Please allow microphone access to connect AI Apprentice."
                : "Microphone is unavailable or in use by another application.";

            emitStatusRef.current("error");
            emitMessageRef.current({
              id: genMsgId(),
              sessionId: input.sessionId,
              timestampMs: Date.now(),
              role: "agent",
              kind: "status",
              text: `⚠️ ${userMsg}`,
            });
            throw new Error(userMsg);
          }
        }

        const agentId =
          input.agentId ||
          opts?.agentId ||
          (typeof import.meta !== "undefined" && import.meta.env?.VITE_ELEVENLABS_AGENT_ID) ||
          "agent_9501m425131dfx5tmyks9aq9a003";

        // Prioritize conversation instance startSession over controls and explicitly supply clientTools
        const startFn = conversationRef.current?.startSession || controlsRef.current?.startSession;
        if (!startFn) {
          emitStatusRef.current("error");
          const errorMsg = "ElevenLabs conversation provider is unavailable. Real voice requires active ElevenLabs session.";
          emitMessageRef.current({
            id: genMsgId(),
            sessionId: input.sessionId,
            timestampMs: Date.now(),
            role: "agent",
            kind: "status",
            text: `⚠️ Voice Agent Error: ${errorMsg}`,
          });
          throw new Error(errorMsg);
        }

        try {
          await startFn({ agentId, clientTools: clientToolsRef.current });
        } catch (sessionErr: unknown) {
          const errObj = sessionErr as Error;
          const errMsg = errObj?.message || String(sessionErr);
          emitStatusRef.current("error");
          emitMessageRef.current({
            id: genMsgId(),
            sessionId: input.sessionId,
            timestampMs: Date.now(),
            role: "agent",
            kind: "status",
            text: `⚠️ Voice Agent Error: Failed to start ElevenLabs session: ${errMsg}`,
          });
          throw new Error(`Failed to start ElevenLabs session: ${errMsg}`);
        }
      },

      disconnect: async (): Promise<void> => {
        const endFn = controlsRef.current?.endSession || conversationRef.current?.endSession;
        if (endFn) {
          try {
            await endFn();
          } catch (e) {
            console.warn("ElevenLabs disconnect warning:", e);
          }
        }
        activeSessionIdRef.current = null;
        emitStatusRef.current("disconnected");
      },

      updateContext: async (context: Record<string, unknown>): Promise<void> => {
        let text = `[CONTEXT] ${JSON.stringify(context)}`;
        if (context.id || context.activeTicketId || context.ticket) {
          const t = ((context.ticket as Record<string, unknown>) || context) as Record<string, unknown>;
          text =
            `[CONTEXT] Active Ticket ${t.id || t.activeTicketId || ""} — ` +
            `Customer: ${t.customer || "Unknown"}, ` +
            `Issue: "${t.issue || ""}", ` +
            `Scope: "${t.scope || ""}", ` +
            `Priority: ${t.priority || "Unset"}, ` +
            `Team: ${t.team || "Unset"}, ` +
            `Action: ${t.action || "Unset"}`;
        }
        const updateFn = controlsRef.current?.sendContextualUpdate || conversationRef.current?.sendContextualUpdate;
        if (updateFn) {
          updateFn(text);
        }
      },

      sendScreenEvent: async (event: ScreenEvent): Promise<void> => {
        const text =
          `[SCREEN] Ticket ${event.ticketId} — ${event.type}: ${event.description}` +
          `${event.newValue ? ` (Value: ${event.newValue})` : ""}`;

        const updateFn = controlsRef.current?.sendContextualUpdate || conversationRef.current?.sendContextualUpdate;
        if (updateFn) {
          updateFn(text);
        }
      },

      sendWorkMap: async (workMap: WorkMap): Promise<void> => {
        const text = `[WORK_MAP] Synthesized Work Map ${workMap.id} with ${workMap.steps.length} steps.`;
        const updateFn = controlsRef.current?.sendContextualUpdate || conversationRef.current?.sendContextualUpdate;
        if (updateFn) {
          updateFn(text);
        }
      },

      sendIntervention: async (intervention: TutorIntervention): Promise<void> => {
        const text = `[INTERVENTION] ${intervention.message} Guardrail: ${intervention.guardrail || ""}`;
        const updateFn = controlsRef.current?.sendContextualUpdate || conversationRef.current?.sendContextualUpdate;
        if (updateFn) {
          updateFn(text);
        }
      },

      onMessage: (callback: (message: AgentMessage) => void): (() => void) => {
        messageSubscribersRef.current.add(callback);
        return () => {
          messageSubscribersRef.current.delete(callback);
        };
      },

      onStatusChange: (callback: (status: string) => void): (() => void) => {
        statusSubscribersRef.current.add(callback);
        callback(statusRef.current);
        return () => {
          statusSubscribersRef.current.delete(callback);
        };
      },
    };
  }, []); // Stable identity!

  if (isMock) {
    return mockAdapterRef.current;
  }

  return realAdapter;
}

