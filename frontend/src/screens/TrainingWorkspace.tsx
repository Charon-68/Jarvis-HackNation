/**
 * P1-14, P1-15, P1-16 — New Hire Training Workspace & Evaluation Gate
 * Unseen Case: T007 (12 customers lost transaction history after an update)
 * Pre-Save Evaluation Gate blocks unsafe commits until ApprenticeApi.evaluateDecision() returns allowSave = true.
 * Tutor Intervention renders severity, message, reason, expert guardrail, and evidence replay.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "../store/sessionStore";
import { TRAINING_CASE } from "../data/ticketRepository";
import { mockApi } from "../mocks/mockServices";
import { useElevenLabsVoiceAgent } from "../adapters/useElevenLabsVoiceAgent";
import { DefaultScreenCaptureController } from "../capture/ScreenCaptureController";
import { MockVisionAdapter } from "../adapters/visionAdapter";
import { FramePipeline } from "../capture/framePipeline";
import type {
  TicketPriority,
  TicketTeam,
  TicketAction,
  DecisionAttempt,
  TutorIntervention,
  TrainingResult,
  WorkMapStep,
  CaptureState,
} from "../types/index";
import ApprenticePanel from "../components/ApprenticePanel";
import EvidenceReplayModal from "../components/EvidenceReplayModal";

const PRIORITIES: TicketPriority[] = ["P1", "P2", "P3"];
const TEAMS: TicketTeam[] = ["Infrastructure", "Support", "Engineering"];
const ACTIONS: TicketAction[] = [
  "Immediate escalation",
  "Normal troubleshooting",
  "STOP normal processing + escalate",
  "Send reset procedure",
  "Investigate performance",
];

let _seq = 1;
function uid(p: string) { return `${p}_${Date.now()}_${_seq++}`; }

function priorityColor(p: string) {
  if (p === "P1") return "var(--p1-text)";
  if (p === "P2") return "var(--p2-text)";
  return "var(--p3-text)";
}

function priorityBg(p: string) {
  if (p === "P1") return "var(--p1-bg)";
  if (p === "P2") return "var(--p2-bg)";
  return "var(--p3-bg)";
}

export default function TrainingWorkspace() {
  const { state, completeSession, dispatchAgentMessage } = useSession();

  // Canonical initial attempt default: P3 / Support / Normal troubleshooting
  const [priority, setPriority] = useState<TicketPriority>("P3");
  const [team, setTeam] = useState<TicketTeam>("Support");
  const [action, setAction] = useState<TicketAction>("Normal troubleshooting");
  const [isSaving, setIsSaving] = useState(false);
  const [intervention, setIntervention] = useState<TutorIntervention | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [evidenceStep, setEvidenceStep] = useState<WorkMapStep | null>(null);

  // Track initial attempt for results evaluation
  const [firstAttempt, setFirstAttempt] = useState<{ priority: string; team: string; action: string } | null>(null);
  const [captureState, setCaptureState] = useState<CaptureState>({ status: "idle" });
  const [agentStatus, setAgentStatus] = useState("offline");

  const voiceAgent = useElevenLabsVoiceAgent();
  const captureControllerRef = useRef<DefaultScreenCaptureController | null>(null);
  const pipelineRef = useRef<FramePipeline | null>(null);

  useEffect(() => {
    if (!state.session?.id) return;
    let isCancelled = false;

    const unsubMsg = voiceAgent.onMessage((msg) => {
      if (!isCancelled) dispatchAgentMessage(msg);
    });

    const unsubStatus = voiceAgent.onStatusChange((s) => {
      if (!isCancelled) setAgentStatus(s);
    });

    voiceAgent
      .connect({ sessionId: state.session.id, mode: "tutor" })
      .catch((err: unknown) => {
        if (!isCancelled) {
          setAgentStatus("error");
          console.warn("Voice agent connection note:", (err as Error).message);
        }
      });

    return () => {
      isCancelled = true;
      unsubMsg();
      unsubStatus();
      voiceAgent.disconnect().catch(console.error);
    };
  }, [state.session?.id, voiceAgent, dispatchAgentMessage]);

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
        // dispatchScreenEvent(evt);
        voiceAgent.sendScreenEvent(evt).catch(console.error);
      },
    });
    pipelineRef.current = pipeline;
    
    // Auto start capture in training
    controller.start().catch(console.error);
    pipeline.start().catch(console.error);

    return () => {
      pipeline.stop();
      controller.stop();
      unsubStatus();
    };
  }, [state.session?.id, voiceAgent]);

  const tc = TRAINING_CASE;
  const workMap = state.workMap;

  useEffect(() => {
    if (agentStatus === "connected" && state.session?.id && workMap) {
      voiceAgent.sendWorkMap(workMap).catch(console.error);

      // Emit initial screen event so tutor knows we opened the training case
      const evt: import("../types/index").ScreenEvent = {
        id: uid("evt"),
        sessionId: state.session.id,
        timestampMs: Date.now(),
        ticketId: tc.id,
        type: "ticket_opened",
        description: `Opened ${tc.id}: ${tc.issue}`,
        source: "workflow_state",
      };
      voiceAgent.sendScreenEvent(evt).catch(console.error);
    }
  }, [agentStatus, state.session?.id, workMap, voiceAgent, tc.id, tc.issue]);

  // Task P1-15 — Pre-Save Evaluation Gate
  const handleSave = async () => {
    if (!state.session || savedOk) return;
    setIsSaving(true);
    setIntervention(null);

    const attempt: DecisionAttempt = {
      id: uid("attempt"),
      sessionId: state.session.id,
      ticketId: tc.id,
      timestampMs: Date.now(),
      priority,
      team,
      action,
      submitted: true,
    };

    if (!firstAttempt) {
      setFirstAttempt({ priority, team, action });
    }

    try {
      // Delegate evaluation strictly to ApprenticeApi (never in React component)
      const evalResult = await mockApi.evaluateDecision(attempt, workMap!);

      if (evalResult.allowSave) {
        setSavedOk(true);
        // Persist training result
        const result: TrainingResult = {
          id: uid("result"),
          sessionId: state.session.id,
          initialDecision: firstAttempt ?? { priority, team, action },
          interventionOccurred: !!firstAttempt && (firstAttempt.priority !== "P1" || firstAttempt.action !== "STOP normal processing + escalate"),
          initialDecisionWrong: !!firstAttempt && (firstAttempt.priority !== "P1" || firstAttempt.action !== "STOP normal processing + escalate"),
          correctionOccurred: !!firstAttempt,
          finalDecision: { priority, team, action },
          completed: true,
          timestampMs: Date.now(),
        };
        await mockApi.saveTrainingResult(result);
        setTrainingResult(result);

        dispatchAgentMessage({
          id: uid("msg"),
          sessionId: state.session.id,
          timestampMs: Date.now(),
          role: "agent",
          kind: "status",
          text: "✅ Excellent work! You correctly identified possible data loss, applied the expert's guardrail, and stopped normal processing.",
        });
      } else if (evalResult.intervention) {
        // Block save and present Tutor Intervention
        setIntervention(evalResult.intervention);

        await voiceAgent.sendIntervention(evalResult.intervention).catch(console.error);

        dispatchAgentMessage({
          id: uid("msg"),
          sessionId: state.session.id,
          timestampMs: Date.now(),
          role: "agent",
          kind: "intervention",
          text: evalResult.intervention.message,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReplayEvidence = () => {
    if (!intervention?.expertEvidence?.workMapStepId || !workMap) return;
    const step = workMap.steps.find((s) => s.id === intervention.expertEvidence!.workMapStepId) ?? null;
    setEvidenceStep(step);
  };

  // Render P1-17 Training Result Screen upon completion
  if (trainingResult) {
    return (
      <ResultsScreen
        result={trainingResult}
        workMap={workMap}
        onFinish={completeSession}
      />
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", overflow: "hidden" }}>
      {/* Main workspace area */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(99,102,241,0.08))",
            borderBottom: "1px solid var(--border-subtle)",
            padding: "16px 24px",
            flexShrink: 0,
          }}
        >
          <div className="flex items-center gap-3" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>🎓</span>
            <div>
              <h2 style={{ marginBottom: 2, fontSize: 16 }}>New Hire Training Workspace</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
                {state.session?.traineeName ?? "Trainee"} · Guided by AI Apprentice Work Map
              </p>
            </div>
          </div>
        </div>

        <div className="scroll-y" style={{ flex: 1, padding: "20px 24px" }}>
          {/* Unseen Case Description Card */}
          <div className="card fade-in" style={{ marginBottom: 20 }}>
            <div className="card-header" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--warning)",
                    background: "var(--warning-dim)",
                    padding: "4px 10px",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  {tc.id}
                </span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Unseen Case Triage</span>
              </div>
              <span className="badge badge-warning">Training Mode</span>
            </div>

            <div style={{ padding: "16px 20px" }}>
              <div className="field-group" style={{ marginBottom: 14 }}>
                <div className="field-label" style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
                  Customer Reported Issue
                </div>
                <p style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.6, color: "var(--text-primary)", margin: 0 }}>
                  "{tc.issue}"
                </p>
              </div>

              <div className="field-group">
                <div className="field-label" style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
                  Impact Scope
                </div>
                <span
                  style={{
                    display: "inline-block",
                    fontSize: 12,
                    fontWeight: 600,
                    background: "var(--bg-raised)",
                    border: "1px solid var(--border-subtle)",
                    padding: "4px 10px",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {tc.scope}
                </span>
              </div>
            </div>
          </div>

          {/* Decision Form */}
          <div className="card fade-in" style={{ marginBottom: 20 }}>
            <div style={{ padding: "18px 20px" }}>
              <h3 style={{ marginBottom: 16, fontSize: 15 }}>Your Triage Decision</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                <div className="field-group">
                  <label className="field-label" htmlFor="train-priority" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4, display: "block" }}>
                    Priority Level
                  </label>
                  <select
                    id="train-priority"
                    className="select-field"
                    value={priority}
                    onChange={(e) => {
                      setPriority(e.target.value as TicketPriority);
                      setIntervention(null);
                    }}
                    disabled={savedOk}
                    style={{ width: "100%", padding: "8px 12px", background: "var(--bg-raised)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="train-team" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4, display: "block" }}>
                    Assigned Team
                  </label>
                  <select
                    id="train-team"
                    className="select-field"
                    value={team}
                    onChange={(e) => {
                      setTeam(e.target.value as TicketTeam);
                      setIntervention(null);
                    }}
                    disabled={savedOk}
                    style={{ width: "100%", padding: "8px 12px", background: "var(--bg-raised)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
                  >
                    {TEAMS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="train-action" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4, display: "block" }}>
                    Triage Action
                  </label>
                  <select
                    id="train-action"
                    className="select-field"
                    value={action}
                    onChange={(e) => {
                      setAction(e.target.value as TicketAction);
                      setIntervention(null);
                    }}
                    disabled={savedOk}
                    style={{ width: "100%", padding: "8px 12px", background: "var(--bg-raised)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
                  >
                    {ACTIONS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selection preview chips */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                <span
                  style={{
                    padding: "5px 12px",
                    borderRadius: "var(--radius-pill)",
                    background: priorityBg(priority),
                    color: priorityColor(priority),
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {priority}
                </span>
                <span className="chip" style={{ background: "var(--bg-raised)", border: "1px solid var(--border-subtle)", padding: "4px 10px", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
                  {team}
                </span>
                <span className="chip" style={{ background: "var(--bg-raised)", border: "1px solid var(--border-subtle)", padding: "4px 10px", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
                  {action}
                </span>
              </div>

              {/* Save Button triggers Pre-Save Evaluation Gate */}
              <button
                id="training-save-btn"
                className="btn btn-primary btn-lg"
                style={{ width: "100%" }}
                onClick={handleSave}
                disabled={savedOk || isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="spinner" /> Evaluating Decision…
                  </>
                ) : savedOk ? (
                  <>✓ Decision Saved</>
                ) : (
                  <>Save Decision</>
                )}
              </button>
            </div>
          </div>

          {/* Task P1-16 — Tutor Intervention UI */}
          {intervention && (
            <div
              className={`fade-in`}
              style={{
                marginBottom: 20,
                padding: "18px 20px",
                borderRadius: "var(--radius-md)",
                background:
                  intervention.severity === "critical"
                    ? "rgba(239, 68, 68, 0.12)"
                    : "rgba(245, 158, 11, 0.12)",
                border: `1px solid ${
                  intervention.severity === "critical"
                    ? "rgba(239, 68, 68, 0.4)"
                    : "rgba(245, 158, 11, 0.4)"
                }`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>
                  {intervention.severity === "critical" ? "🚨" : "⚠️"}
                </span>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 15,
                    color: intervention.severity === "critical" ? "#f87171" : "#fbbf24",
                  }}
                >
                  {intervention.severity === "critical" ? "CHECK THIS DECISION" : "Decision Review Required"}
                </span>
              </div>

              <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text-primary)", marginBottom: 14 }}>
                {intervention.message}
              </p>

              {intervention.guardrail && (
                <div
                  style={{
                    background: "rgba(0,0,0,0.25)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 14px",
                    borderLeft: "3px solid #ef4444",
                    marginBottom: 12,
                  }}
                >
                  <div className="field-label" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#f87171", marginBottom: 4 }}>
                    Expert Rule / Guardrail
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--text-primary)", fontWeight: 600, lineHeight: 1.5, margin: 0 }}>
                    {intervention.guardrail}
                  </p>
                </div>
              )}

              {intervention.reason && (
                <div
                  style={{
                    background: "rgba(0,0,0,0.18)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 14px",
                    marginBottom: 16,
                  }}
                >
                  <div className="field-label" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
                    Why
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                    {intervention.reason}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setIntervention(null)}
                  style={{ borderColor: "var(--border-default)" }}
                >
                  ✏️ Fix Decision
                </button>
                {intervention.expertEvidence && (
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={handleReplayEvidence}
                    style={{ borderColor: "var(--brand-primary-glow)", color: "var(--brand-primary)" }}
                  >
                    📷 Replay Expert Evidence
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Apprentice Panel */}
      <div
        className="card"
        style={{
          width: 300,
          borderRadius: 0,
          borderTop: "none",
          borderRight: "none",
          borderBottom: "none",
          flexShrink: 0,
        }}
      >
        <ApprenticePanel
          agentStatus={agentStatus}
          messages={state.agentMessages}
          screenEvents={state.screenEvents}
        />
      </div>

      {/* Evidence Modal */}
      <EvidenceReplayModal
        step={evidenceStep}
        onClose={() => setEvidenceStep(null)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task P1-17 — Training Result Screen
// ---------------------------------------------------------------------------

interface ResultsProps {
  result: TrainingResult;
  workMap: import("../types/index").WorkMap | null;
  onFinish: () => void;
}

function ResultsScreen({ result, workMap, onFinish }: ResultsProps) {
  const firstCorrect = !result.initialDecisionWrong;

  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        gap: 24,
        background: "radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.1) 0%, transparent 60%)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>
          {firstCorrect ? "🏆" : result.correctionOccurred ? "✅" : "📚"}
        </div>
        <h1 style={{ marginBottom: 8, fontSize: 26 }}>
          {firstCorrect
            ? "Training Complete!"
            : result.correctionOccurred
            ? "Well Done — Corrected!"
            : "Training Session Ended"}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 15, maxWidth: 480, lineHeight: 1.7, margin: "0 auto" }}>
          {firstCorrect
            ? "You applied the expert's knowledge correctly on your first attempt."
            : result.correctionOccurred
            ? "You successfully corrected your triage decision after applying the expert's data-loss guardrail."
            : "Training session recorded."}
        </p>
      </div>

      {/* Result summary card */}
      <div className="card fade-in" style={{ width: "100%", maxWidth: 540 }}>
        <div style={{ padding: "20px 24px" }}>
          <h3 style={{ marginBottom: 16, fontSize: 15 }}>Trainee Evaluation Summary</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <ResultRow
              label="Tutor Intervention Triggered"
              value={result.interventionOccurred ? "Yes" : "No"}
              color={result.interventionOccurred ? "var(--warning)" : "var(--success)"}
            />
            <ResultRow
              label="First Attempt Correct"
              value={!result.initialDecisionWrong ? "✓ Yes" : "✗ Blocked (Safety Guardrail Violation)"}
              color={!result.initialDecisionWrong ? "var(--success)" : "#f87171"}
            />
            {result.correctionOccurred && (
              <ResultRow
                label="Corrected Decision Saved"
                value="✓ Yes"
                color="var(--success)"
              />
            )}
            <div style={{ height: 1, background: "var(--border-subtle)", margin: "8px 0" }} />
            <div>
              <div className="field-label" style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                Final Decision Committed
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    padding: "5px 12px",
                    borderRadius: "var(--radius-pill)",
                    background: priorityBg(result.finalDecision.priority || "P1"),
                    color: priorityColor(result.finalDecision.priority || "P1"),
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {result.finalDecision.priority}
                </span>
                <span className="chip" style={{ background: "var(--bg-raised)", border: "1px solid var(--border-subtle)", padding: "4px 10px", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
                  {result.finalDecision.team}
                </span>
                <span className="chip" style={{ background: "var(--bg-raised)", border: "1px solid var(--border-subtle)", padding: "4px 10px", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
                  {result.finalDecision.action}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key rule learned */}
      {workMap?.guardrails && workMap.guardrails.length > 0 && (
        <div
          className="card fade-in"
          style={{
            width: "100%",
            maxWidth: 540,
            border: "1px solid rgba(99,102,241,0.25)",
            background: "var(--brand-primary-dim)",
          }}
        >
          <div style={{ padding: "16px 20px" }}>
            <h3 style={{ marginBottom: 8, color: "var(--brand-primary)", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Key Expert Rule Reinforced
            </h3>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-primary)", fontWeight: 500, margin: 0 }}>
              {workMap.guardrails[0]}
            </p>
          </div>
        </div>
      )}

      <button className="btn btn-primary btn-lg" onClick={onFinish} style={{ minWidth: 220 }}>
        Finish Training Session
      </button>
    </div>
  );
}

function ResultRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
