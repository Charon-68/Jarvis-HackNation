/**
 * P1-02, P1-04, P1-10 — Expert Capture Workspace
 * Three-panel layout: Ticket Queue | Active Ticket | AI Apprentice
 * with session controls bottom bar and real ElevenLabs voice integration.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSession } from "../store/sessionStore";
import { listTickets, EXPERT_SEQUENCE } from "../data/ticketRepository";
import TicketQueue from "../components/TicketQueue";
import ActiveTicket from "../components/ActiveTicket";
import ApprenticePanel from "../components/ApprenticePanel";
import SessionControls from "../components/SessionControls";
import type {
  Ticket,
  TicketPriority,
  TicketTeam,
  TicketAction,
  ScreenEvent,
  CaptureStatus,
  CaptureState,
} from "../types/index";
import { useElevenLabsVoiceAgent } from "../adapters/useElevenLabsVoiceAgent";
import { DefaultScreenCaptureController } from "../capture/ScreenCaptureController";
import { MockVisionAdapter } from "../adapters/visionAdapter";
import { FramePipeline } from "../capture/framePipeline";
import { evidenceStore } from "../store/evidenceStore";

let _eventSeq = 1;
function genEventId() {
  return `evt_ui_${Date.now()}_${_eventSeq++}`;
}

export default function CaptureWorkspace() {
  const { state, endCapture, dispatchAgentMessage, dispatchScreenEvent, dispatchEvaluationResult } = useSession();

  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [solvedTicketIds, setSolvedTicketIds] = useState<string[]>([]);
  const [ticketOverrides, setTicketOverrides] = useState<
    Record<string, Partial<Pick<Ticket, "priority" | "team" | "action">>>
  >({});
  const [captureState, setCaptureState] = useState<CaptureState>({ status: "idle" });
  const [elapsed, setElapsed] = useState(0);
  const [agentStatus, setAgentStatus] = useState("offline");
  const [isSaving, setIsSaving] = useState(false);

  // Real ElevenLabs Voice Agent hook bridge
  const voiceAgent = useElevenLabsVoiceAgent();

  const captureControllerRef = useRef<DefaultScreenCaptureController | null>(null);
  const pipelineRef = useRef<FramePipeline | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const rawTickets = listTickets();
  const tickets: Ticket[] = useMemo(
    () =>
      rawTickets.map((t) => ({
        ...t,
        ...(ticketOverrides[t.id] || {}),
      })),
    [rawTickets, ticketOverrides],
  );
  const activeTicket: Ticket | null = tickets.find((t) => t.id === activeTicketId) ?? null;
  const captureStatus = captureState.status;

  // Reset overrides on session change
  useEffect(() => {
    setTicketOverrides({});
  }, [state.session?.id]);

  // Real ElevenLabs Voice Connection lifecycle & Effect Cleanup
  useEffect(() => {
    if (!state.session?.id) return;
    let isCancelled = false;

    const unsubMsg = voiceAgent.onMessage((msg) => {
      if (!isCancelled) dispatchAgentMessage(msg);
    });

    const unsubStatus = voiceAgent.onStatusChange((s) => {
      if (!isCancelled) setAgentStatus(s);
    });

    // Connect voice session
    voiceAgent
      .connect({ sessionId: state.session.id, mode: "interviewer" })
      .catch((err: unknown) => {
        if (!isCancelled) {
          setAgentStatus("error");
          console.warn("Voice agent connection note:", (err as Error).message);
        }
      });

    // Clean synchronous useEffect return
    return () => {
      isCancelled = true;
      unsubMsg();
      unsubStatus();
      voiceAgent.disconnect().catch(console.error);
    };
  }, [state.session?.id, voiceAgent, dispatchAgentMessage]);

  // Initialize capture controller and frame pipeline
  useEffect(() => {
    const controller = new DefaultScreenCaptureController({ sampleIntervalMs: 3000 });
    captureControllerRef.current = controller;

    const unsubStatus = controller.onStatusChange((st) => {
      setCaptureState(st);
    });

    // Explicit mock vision fallback for development (backend /api/vision/analyze-frame route is un-mounted)
    const visionAdapter = new MockVisionAdapter();
    const pipeline = new FramePipeline({
      sessionId: state.session?.id ?? "local",
      captureController: controller,
      visionAdapter,
      onScreenEvent: (evt, frame) => {
        if (frame && evt.screenshotRef) {
          evidenceStore.saveEvidence(evt.screenshotRef, frame, evt.ticketId);
        }
        dispatchScreenEvent(evt);
        voiceAgent.sendScreenEvent(evt).catch(console.error);
      },
    });
    pipelineRef.current = pipeline;

    return () => {
      pipeline.stop();
      controller.stop();
      unsubStatus();
    };
  }, [state.session?.id, voiceAgent, dispatchScreenEvent]);

  // Session elapsed timer
  useEffect(() => {
    if (captureStatus === "active") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [captureStatus]);

  const handleStart = useCallback(async () => {
    if (!activeTicketId) setActiveTicketId(EXPERT_SEQUENCE[0]);
    if (pipelineRef.current) pipelineRef.current.start();

    try {
      if (captureControllerRef.current) {
        await captureControllerRef.current.start();
      }
    } catch (err: unknown) {
      console.warn("Screen capture start note:", (err as Error).message);
    }
  }, [activeTicketId]);

  const handlePause = useCallback(() => {
    if (captureControllerRef.current) captureControllerRef.current.pause();
  }, []);

  const handleResume = useCallback(() => {
    if (captureControllerRef.current) captureControllerRef.current.resume();
  }, []);

  const handleStop = useCallback(() => {
    if (captureControllerRef.current) captureControllerRef.current.stop();
    if (pipelineRef.current) pipelineRef.current.stop();
  }, []);

  const handleEndExpertTask = useCallback(async () => {
    handleStop();
    await endCapture();
  }, [endCapture, handleStop]);

  const handleTicketSelect = useCallback(
    (id: string) => {
      if (captureStatus === "paused") return;

      setActiveTicketId(id);
      dispatchEvaluationResult(null);

      // Emit ticket_opened screen event
      const ticket = tickets.find((t) => t.id === id);
      if (ticket && captureStatus === "active") {
        const event: ScreenEvent = {
          id: genEventId(),
          sessionId: state.session?.id ?? "local",
          timestampMs: Date.now(),
          ticketId: id,
          type: "ticket_opened",
          description: `Opened ${id}: ${ticket.issue}`,
          source: "workflow_state",
        };
        dispatchScreenEvent(event);
        voiceAgent.sendScreenEvent(event).catch(console.error);
      }
    },
    [captureStatus, tickets, state.session, voiceAgent, dispatchScreenEvent, dispatchEvaluationResult],
  );

  // Synchronize active ticket context (ticket/priority/team/action) with ElevenLabs
  useEffect(() => {
    if (activeTicket && agentStatus === "connected") {
      voiceAgent
        .updateContext({
          id: activeTicket.id,
          customer: activeTicket.customer,
          issue: activeTicket.issue,
          scope: activeTicket.scope,
          priority: activeTicket.priority,
          team: activeTicket.team,
          action: activeTicket.action,
          expertReasoning: activeTicket.expertReasoning,
        })
        .catch(console.error);
    }
  }, [activeTicketId, activeTicket, agentStatus, voiceAgent]);

  const handleFieldChange = useCallback(
    (field: "priority" | "team" | "action", value: string) => {
      if (!activeTicket) return;

      setTicketOverrides((prev) => ({
        ...prev,
        [activeTicket.id]: {
          ...prev[activeTicket.id],
          [field]: value,
        },
      }));

      if (captureStatus !== "active") return;

      const event: ScreenEvent = {
        id: genEventId(),
        sessionId: state.session?.id ?? "local",
        timestampMs: Date.now(),
        ticketId: activeTicket.id,
        type: field === "priority" ? "priority_changed" : field === "team" ? "team_changed" : "action_changed",
        description: `${field.charAt(0).toUpperCase() + field.slice(1)} set to ${value}`,
        newValue: value,
        source: "workflow_state",
      };
      dispatchScreenEvent(event);
      voiceAgent.sendScreenEvent(event).catch(console.error);
      voiceAgent
        .updateContext({
          ...activeTicket,
          [field]: value,
        })
        .catch(console.error);
    },
    [activeTicket, captureStatus, state.session, dispatchScreenEvent, voiceAgent],
  );

  const handleSave = useCallback(
    async (decision: { priority: TicketPriority; team: TicketTeam; action: TicketAction }) => {
      if (!activeTicket || !state.session) return;
      setIsSaving(true);
      dispatchEvaluationResult(null);

      setTicketOverrides((prev) => ({
        ...prev,
        [activeTicket.id]: {
          priority: decision.priority,
          team: decision.team,
          action: decision.action,
        },
      }));

      try {
        const baseEvent: Omit<ScreenEvent, "id" | "type" | "description" | "newValue"> = {
          sessionId: state.session.id,
          timestampMs: Date.now(),
          ticketId: activeTicket.id,
          source: "workflow_state",
        };

        let frameObj: Blob | ImageBitmap | null = null;
        if (captureControllerRef.current && captureStatus === "active") {
          frameObj = await captureControllerRef.current.grabCurrentFrame().catch(() => null);
        }

        const saveRef = `screenshot_${activeTicket.id.toLowerCase()}_saved.png`;
        if (frameObj) {
          evidenceStore.saveEvidence(saveRef, frameObj, activeTicket.id);
          evidenceStore.saveEvidence(`screenshot_${activeTicket.id.toLowerCase()}_p1.png`, frameObj, activeTicket.id);
          evidenceStore.saveEvidence(`screenshot_${activeTicket.id.toLowerCase()}_stop.png`, frameObj, activeTicket.id);
        }

        const events: ScreenEvent[] = [
          {
            ...baseEvent,
            id: genEventId(),
            type: "priority_changed",
            description: `Priority set to ${decision.priority}`,
            newValue: decision.priority,
          },
          {
            ...baseEvent,
            id: genEventId(),
            type: "team_changed",
            description: `Team set to ${decision.team}`,
            newValue: decision.team,
          },
          {
            ...baseEvent,
            id: genEventId(),
            type: "action_changed",
            description: `Action set to ${decision.action}`,
            newValue: decision.action,
          },
          {
            ...baseEvent,
            id: genEventId(),
            type: "decision_saved",
            description: `Decision saved for ${activeTicket.id}`,
            screenshotRef: saveRef,
          },
        ];

        for (const e of events) {
          dispatchScreenEvent(e);
          if (captureStatus === "active") {
            await voiceAgent.sendScreenEvent(e).catch(console.error);
          }
        }

        // In expert mode, save without evaluation gate
        setSolvedTicketIds((prev) => [...prev.filter((x) => x !== activeTicket.id), activeTicket.id]);
        dispatchEvaluationResult({ allowSave: true, intervention: null });

        // Auto-advance to next ticket in sequence
        const currentIdx = EXPERT_SEQUENCE.indexOf(activeTicket.id);
        if (currentIdx >= 0 && currentIdx < EXPERT_SEQUENCE.length - 1) {
          setTimeout(() => {
            const nextId = EXPERT_SEQUENCE[currentIdx + 1];
            setActiveTicketId(nextId);
            dispatchEvaluationResult(null);
          }, 800);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [activeTicket, state.session, captureStatus, voiceAgent, dispatchScreenEvent, dispatchEvaluationResult],
  );

  const isCapturingPaused = captureStatus === "paused";
  const canSelect = captureStatus === "active" || captureStatus === "idle";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Paused overlay banner */}
      {isCapturingPaused && (
        <div
          style={{
            background: "var(--warning-dim)",
            borderBottom: "1px solid rgba(245,158,11,0.3)",
            padding: "8px 20px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--warning)",
            flexShrink: 0,
          }}
        >
          <span className="status-dot paused" />
          Off Record — AI is not listening. Resume to continue capture.
        </div>
      )}

      {/* Error / Permission denied banner */}
      {captureState.error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            borderBottom: "1px solid rgba(239, 68, 68, 0.3)",
            padding: "8px 20px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
            color: "#f87171",
            flexShrink: 0,
          }}
        >
          <span className="status-dot error" style={{ background: "#ef4444" }} />
          Capture Note: {captureState.error}
        </div>
      )}

      {/* Three-panel workspace */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "220px 1fr 280px",
          overflow: "hidden",
        }}
      >
        {/* Left: Ticket Queue */}
        <div
          className="card"
          style={{
            borderRadius: 0,
            borderTop: "none",
            borderLeft: "none",
            borderBottom: "none",
          }}
        >
          <TicketQueue
            tickets={tickets}
            activeTicketId={activeTicketId}
            solvedTicketIds={solvedTicketIds}
            onSelect={handleTicketSelect}
            disabled={!canSelect}
          />
        </div>

        {/* Center: Active Ticket */}
        <div
          className="card"
          style={{
            borderRadius: 0,
            borderTop: "none",
            borderBottom: "none",
          }}
        >
          <ActiveTicket
            ticket={activeTicket}
            onSave={handleSave}
            evaluationResult={state.evaluationResult}
            onClearEvaluation={() => dispatchEvaluationResult(null)}
            disabled={captureStatus !== "active"}
            mode="expert"
            isSaving={isSaving}
            onFieldChange={handleFieldChange}
          />
        </div>

        {/* Right: Apprentice Panel */}
        <div
          className="card"
          style={{
            borderRadius: 0,
            borderTop: "none",
            borderRight: "none",
            borderBottom: "none",
          }}
        >
          <ApprenticePanel
            agentStatus={agentStatus}
            messages={state.agentMessages}
            screenEvents={state.screenEvents}
          />
        </div>
      </div>

      {/* Bottom: Session Controls */}
      <SessionControls
        phase={state.phase}
        captureStatus={captureStatus}
        elapsed={elapsed}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
        onEndExpertTask={handleEndExpertTask}
        onStartTraining={() => {}}
        loading={state.loading}
      />
    </div>
  );
}
