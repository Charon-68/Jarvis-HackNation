/**
 * P1-02, P1-04, P1-10 — Expert Capture Workspace
 * Three-panel layout: Ticket Queue | Active Ticket | AI Apprentice
 * with session controls bottom bar.
 */
import { useState, useEffect, useRef, useCallback } from "react";
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
import { mockVoiceAgent } from "../mocks/mockServices";
import { DefaultScreenCaptureController } from "../capture/ScreenCaptureController";
import { MockVisionAdapter } from "../adapters/visionAdapter";
import { FramePipeline } from "../capture/framePipeline";

let _eventSeq = 1;
function genEventId() { return `evt_ui_${Date.now()}_${_eventSeq++}`; }

export default function CaptureWorkspace() {
  const { state, endCapture, dispatchAgentMessage, dispatchScreenEvent, dispatchEvaluationResult } = useSession();

  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [solvedTicketIds, setSolvedTicketIds] = useState<string[]>([]);
  const [captureState, setCaptureState] = useState<CaptureState>({ status: "idle" });
  const [elapsed, setElapsed] = useState(0);
  const [agentStatus, setAgentStatus] = useState("offline");
  const [isSaving, setIsSaving] = useState(false);
  const [voiceConnected, setVoiceConnected] = useState(false);

  const captureControllerRef = useRef<DefaultScreenCaptureController | null>(null);
  const pipelineRef = useRef<FramePipeline | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tickets = listTickets();
  const activeTicket: Ticket | null = tickets.find((t) => t.id === activeTicketId) ?? null;
  const captureStatus = captureState.status;

  // Initialize capture controller and frame pipeline
  useEffect(() => {
    const controller = new DefaultScreenCaptureController({ sampleIntervalMs: 3000 });
    captureControllerRef.current = controller;

    const unsubStatus = controller.onStatusChange((st) => {
      setCaptureState(st);
    });

    const visionAdapter = new MockVisionAdapter();
    const pipeline = new FramePipeline({
      sessionId: state.session?.id ?? "local",
      captureController: controller,
      visionAdapter,
      onScreenEvent: (evt) => {
        dispatchScreenEvent(evt);
        mockVoiceAgent.sendScreenEvent(evt).catch(console.error);
      },
    });
    pipelineRef.current = pipeline;

    return () => {
      pipeline.stop();
      controller.stop();
      unsubStatus();
    };
  }, [state.session?.id, dispatchScreenEvent]);

  // Connect voice agent when session starts
  useEffect(() => {
    if (!state.session || voiceConnected) return;
    (async () => {
      const unsub1 = mockVoiceAgent.onMessage((msg) => dispatchAgentMessage(msg));
      const unsub2 = mockVoiceAgent.onStatusChange((s) => {
        setAgentStatus(s);
      });
      await mockVoiceAgent.connect({ sessionId: state.session!.id, mode: "interviewer" });
      setVoiceConnected(true);
      return () => { unsub1(); unsub2(); };
    })();
  }, [state.session, voiceConnected, dispatchAgentMessage]);

  // Timer
  useEffect(() => {
    if (captureStatus === "active") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
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

  const handleTicketSelect = useCallback((id: string) => {
    if (captureStatus === "paused") return;
    const prev = activeTicketId;

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
      mockVoiceAgent.sendScreenEvent(event).catch(console.error);
    }
    void prev;
  }, [activeTicketId, captureStatus, tickets, state.session, dispatchScreenEvent, dispatchEvaluationResult]);

  const handleSave = useCallback(async (decision: { priority: TicketPriority; team: TicketTeam; action: TicketAction }) => {
    if (!activeTicket || !state.session) return;
    setIsSaving(true);
    dispatchEvaluationResult(null);

    try {
      // Emit field change events
      const baseEvent: Omit<ScreenEvent, "id" | "type" | "description" | "newValue"> = {
        sessionId: state.session.id,
        timestampMs: Date.now(),
        ticketId: activeTicket.id,
        source: "workflow_state",
      };

      const events: ScreenEvent[] = [
        { ...baseEvent, id: genEventId(), type: "priority_changed", description: `Priority set to ${decision.priority}`, newValue: decision.priority },
        { ...baseEvent, id: genEventId(), type: "team_changed", description: `Team set to ${decision.team}`, newValue: decision.team },
        { ...baseEvent, id: genEventId(), type: "action_changed", description: `Action set to ${decision.action}`, newValue: decision.action },
        { ...baseEvent, id: genEventId(), type: "decision_saved", description: `Decision saved for ${activeTicket.id}` },
      ];

      for (const e of events) {
        dispatchScreenEvent(e);
        if (captureStatus === "active") {
          await mockVoiceAgent.sendScreenEvent(e).catch(console.error);
        }
      }

      // In expert mode, just save without evaluation
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
  }, [activeTicket, state.session, captureStatus, dispatchScreenEvent, dispatchEvaluationResult]);

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
