/**
 * P1-14, P1-15, P1-16 — New Hire Training Workspace & Evaluation Gate
 * Unseen Case: T007 (12 customers lost transaction history after an update)
 * Pre-Save Evaluation Gate blocks unsafe commits until ApprenticeApi.evaluateDecision() returns allowSave = true.
 * Tutor Intervention renders severity, message, reason, expert guardrail, and evidence replay.
 */

import Workspace from "../components/shell/Workspace";
import {
  ArrowRight,
  CheckCheck,
  CheckCircle2,
  FileText,
  GraduationCap,
  OctagonAlert,
  PencilLine,
  PlayCircle,
  ShieldX,
  Sparkles,
  TriangleAlert,
  Trophy,
  Users,
} from "lucide-react";
import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import SelectField from "../components/ui/SelectField";
import PriorityBadge from "../components/ui/PriorityBadge";
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

const PRIORITIES: TicketPriority[] = ["Emergency", "Moderate", "Low Priority"];
const TEAMS: TicketTeam[] = [
  "Operations",
  "HR",
  "Engineering",
  "Customer Support",
  "Accounting",
];
const ACTIONS: TicketAction[] = [
  "Escalate Immediately",
  "Investigate & Resolve",
  "Follow Standard Procedure",
  "Request More Information",
  "Monitor & Follow Up",
];

let _seq = 1;
function uid(p: string) { return `${p}_${Date.now()}_${_seq++}`; }

export default function TrainingWorkspace() {
  const { state, completeSession, dispatchAgentMessage } = useSession();

  // Canonical initial attempt default: Low Priority / Customer Support / Follow Standard Procedure
  const [priority, setPriority] = useState<TicketPriority>("Low Priority");
  const [team, setTeam] = useState<TicketTeam>("Customer Support");
  const [action, setAction] = useState<TicketAction>("Follow Standard Procedure");
  const [isSaving, setIsSaving] = useState(false);
  const [intervention, setIntervention] = useState<TutorIntervention | null>(null);
  /** Increments on every blocked save; re-triggers the workspace "flinch". */
  const [blockCount, setBlockCount] = useState(0);
  const [flinchScope, animateFlinch] = useAnimate<HTMLDivElement>();
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (blockCount === 0 || reduceMotion || !flinchScope.current) return;
    animateFlinch(flinchScope.current, { x: [0, -10, 9, -6, 4, -2, 0] }, { duration: 0.5, ease: "easeOut" });
  }, [blockCount, reduceMotion, animateFlinch, flinchScope]);
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
    pipeline.start();

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

      // Synchronize training case context
      voiceAgent
        .updateContext({
          id: tc.id,
          issue: tc.issue,
          scope: tc.scope,
          priority,
          team,
          action,
        })
        .catch(console.error);

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
  }, [agentStatus, state.session?.id, workMap, voiceAgent, tc.id, tc.issue, tc.scope, priority, team, action]);

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
          interventionOccurred: !!firstAttempt && (firstAttempt.priority !== "Emergency" || firstAttempt.action !== "Escalate Immediately"),
          initialDecisionWrong: !!firstAttempt && (firstAttempt.priority !== "Emergency" || firstAttempt.action !== "Escalate Immediately"),
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
        setBlockCount((n) => n + 1);

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

  const blocked = !!intervention;
  const critical = intervention?.severity === "critical";

  const mainPane = (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-line bg-[linear-gradient(90deg,rgba(200,246,90,0.05),transparent_60%)] px-5 py-3.5">
        <span className="grid size-9 place-items-center rounded-lg bg-signal/10 ring-1 ring-signal/30">
          <GraduationCap className="size-4 text-signal" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="m-0 text-[15px] font-medium normal-case tracking-normal text-fg">New hire training</h2>
          <p className="m-0 truncate font-mono text-[11px] text-fg-faint">
            {state.session?.traineeName ?? "Trainee"} · guided by the expert&apos;s Work Map
          </p>
        </div>
      </div>

      {/* Save-blocked strip (sticky while an intervention is active) */}
      <AnimatePresence>
        {blocked && (
          <motion.div
            key="blocked-strip"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="shrink-0 overflow-hidden"
          >
            <div
              className={`flex items-center gap-2.5 border-b px-5 py-2.5 text-[13px] font-semibold ${
                critical ? "border-stop/40 bg-stop/15 text-stop" : "border-amber/40 bg-amber/10 text-amber"
              }`}
            >
              <ShieldX className="size-4 shrink-0" aria-hidden />
              Save blocked by the tutor
              <span className="hud-tag ml-auto font-normal opacity-80 max-sm:hidden">Expert guardrail</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          {/* Unseen case */}
          <section className="rounded-2xl border border-line bg-surface/60 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="rounded-md bg-amber/10 px-2 py-1 font-mono text-[12px] text-amber ring-1 ring-amber/30">{tc.id}</span>
                <span className="text-sm font-medium text-fg">Unseen case</span>
              </div>
              <span className="hud-tag rounded-full border border-amber/30 px-2 py-0.5 text-amber">Not in the expert demo</span>
            </div>
            <p className="hud-tag mb-1.5 text-fg-faint">Customer reported issue</p>
            <p className="m-0 font-display text-[24px] leading-[1.2] text-fg">&ldquo;{tc.issue}&rdquo;</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="hud-tag text-fg-faint">Impact scope</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1 text-xs text-fg-muted">
                <Users className="size-3.5" aria-hidden />
                {tc.scope}
              </span>
            </div>
          </section>

          {/* Decision */}
          <section
            className={`rounded-2xl border p-5 transition-colors duration-500 ${blocked ? "border-stop/40 bg-stop/[0.04]" : "border-line bg-surface/60"}`}
            aria-labelledby="decision-title"
          >
            <h3 id="decision-title" className="hud-tag m-0 mb-4 text-fg-faint">
              Your triage decision
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id="train-priority"
                label="Priority level"
                value={priority}
                options={PRIORITIES}
                disabled={savedOk}
                invalid={blocked}
                onChange={(v) => {
                  setPriority(v as TicketPriority);
                  setIntervention(null);
                }}
              />
              <SelectField
                id="train-team"
                label="Assigned team"
                value={team}
                options={TEAMS}
                disabled={savedOk}
                invalid={blocked}
                onChange={(v) => {
                  setTeam(v as TicketTeam);
                  setIntervention(null);
                }}
              />
              <div className="sm:col-span-2">
                <SelectField
                  id="train-action"
                  label="Triage action"
                  value={action}
                  options={ACTIONS}
                  disabled={savedOk}
                  invalid={blocked}
                  onChange={(v) => {
                    setAction(v as TicketAction);
                    setIntervention(null);
                  }}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <PriorityBadge priority={priority} size="md" />
              <span className="rounded-full border border-line bg-raised px-2.5 py-1 text-xs text-fg-muted">{team}</span>
              <span className="rounded-full border border-line bg-raised px-2.5 py-1 text-xs text-fg-muted">{action}</span>
            </div>

            <button
              id="training-save-btn"
              onClick={handleSave}
              disabled={savedOk || isSaving}
              className={`focus-ring mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-medium transition disabled:cursor-not-allowed ${
                savedOk
                  ? "bg-verified/15 text-verified ring-1 ring-verified/40"
                  : blocked
                    ? "bg-stop/15 text-stop ring-1 ring-stop/45 hover:bg-stop/20"
                    : "bg-signal text-signal-ink shadow-[0_0_28px_rgba(200,246,90,0.18)] hover:bg-[#d6ff78]"
              }`}
            >
              {isSaving ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" /> Evaluating decision…
                </>
              ) : savedOk ? (
                <>
                  <CheckCircle2 className="size-4" aria-hidden /> Decision saved
                </>
              ) : blocked ? (
                <>
                  <ShieldX className="size-4" aria-hidden /> Blocked. Fix the decision first
                </>
              ) : (
                <>Save decision</>
              )}
            </button>
          </section>

          {/* Task P1-16 — Tutor intervention */}
          <AnimatePresence>
            {intervention && (
              <motion.section
                key={intervention.message}
                role="alert"
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className={`overflow-hidden rounded-2xl border ${critical ? "border-stop/50 bg-[#1a0c0b]" : "border-amber/45 bg-[#1a1409]"}`}
              >
                <div className="flex items-center gap-3 px-5 pt-5">
                  <span className={`grid size-10 place-items-center rounded-xl ${critical ? "bg-stop/15 text-stop" : "bg-amber/15 text-amber"}`}>
                    {critical ? <OctagonAlert className="size-5" aria-hidden /> : <TriangleAlert className="size-5" aria-hidden />}
                  </span>
                  <div>
                    <p className={`hud-tag m-0 ${critical ? "text-stop" : "text-amber"}`}>Tutor intervention</p>
                    <p className="m-0 text-[16px] font-semibold text-fg">{critical ? "Check this decision" : "Decision review required"}</p>
                  </div>
                </div>
                <p className="px-5 pt-3 text-[14px] leading-relaxed text-fg">{intervention.message}</p>

                {intervention.guardrail && (
                  <figure className="mx-5 mt-4 border-l-2 border-stop/70 pl-4">
                    <figcaption className="hud-tag mb-1 text-stop">Expert rule</figcaption>
                    <blockquote className="m-0 font-display text-[22px] leading-[1.25] text-fg">{intervention.guardrail}</blockquote>
                  </figure>
                )}

                {intervention.reason && (
                  <div className="mx-5 mt-4 rounded-xl border border-line bg-ink/40 px-4 py-3">
                    <p className="hud-tag mb-1 text-fg-faint">Why</p>
                    <p className="m-0 text-[13px] leading-relaxed text-fg-muted">{intervention.reason}</p>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2 border-t border-line bg-ink/40 px-5 py-3.5">
                  <button
                    onClick={() => setIntervention(null)}
                    className="focus-ring flex items-center gap-1.5 rounded-lg bg-fg px-3.5 py-2 text-[13px] font-medium text-ink transition hover:bg-white"
                  >
                    <PencilLine className="size-4" aria-hidden /> Fix decision
                  </button>
                  {intervention.expertEvidence && (
                    <button
                      onClick={handleReplayEvidence}
                      className="focus-ring flex items-center gap-1.5 rounded-lg border border-signal/35 bg-signal/10 px-3.5 py-2 text-[13px] text-signal transition hover:bg-signal/15"
                    >
                      <PlayCircle className="size-4" aria-hidden /> Replay expert evidence
                    </button>
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* The blocked-save moment: the whole workspace flinches and a red frame
          holds until the decision changes. Reduced motion keeps only the frame. */}
      <div ref={flinchScope} className="flex min-h-0 flex-1 flex-col">
        <Workspace
          initial="case"
          panes={[
            { id: "case", label: "Case", icon: FileText, width: "minmax(0,1fr)", node: mainPane },
            {
              id: "tutor",
              label: "Tutor",
              icon: Sparkles,
              width: "320px",
              badge: intervention ? <span className="size-1.5 rounded-full bg-stop" aria-hidden /> : null,
              node: (
                <ApprenticePanel
                  agentStatus={agentStatus}
                  messages={state.agentMessages}
                  screenEvents={state.screenEvents}
                  variant="tutor"
                  alert={!!intervention}
                />
              ),
            },
          ]}
        />
      </div>
      <AnimatePresence>
        {blocked && (
          <motion.div
            key="blocked-frame"
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.55] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, times: [0, 0.25, 1] }}
            style={{
              boxShadow: critical
                ? "inset 0 0 0 2px rgba(255,93,82,0.7), inset 0 0 120px rgba(255,93,82,0.22)"
                : "inset 0 0 0 2px rgba(245,181,68,0.6), inset 0 0 120px rgba(245,181,68,0.18)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Evidence Modal */}
      <EvidenceReplayModal step={evidenceStep} onClose={() => setEvidenceStep(null)} />
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
  const title = firstCorrect ? "Training complete" : result.correctionOccurred ? "Well done, corrected" : "Training session ended";
  const body = firstCorrect
    ? "You applied the expert's knowledge correctly on your first attempt."
    : result.correctionOccurred
      ? "You corrected your triage decision after the tutor applied the expert's data-loss guardrail."
      : "Training session recorded.";

  const timeline = [
    !firstCorrect && {
      icon: ShieldX,
      tone: "text-stop bg-stop/15 ring-stop/35",
      label: "First attempt blocked",
      detail: `${result.initialDecision.priority} · ${result.initialDecision.team} · ${result.initialDecision.action}`,
    },
    result.interventionOccurred && {
      icon: Sparkles,
      tone: "text-signal bg-signal/10 ring-signal/30",
      label: "Tutor explained the expert rule",
      detail: "Intervention before the save was committed",
    },
    {
      icon: CheckCircle2,
      tone: "text-verified bg-verified/15 ring-verified/35",
      label: firstCorrect ? "Saved on the first attempt" : "Corrected decision saved",
      detail: `${result.finalDecision.priority} · ${result.finalDecision.team} · ${result.finalDecision.action}`,
    },
  ].filter(Boolean) as Array<{ icon: typeof CheckCircle2; tone: string; label: string; detail: string }>;

  return (
    <div className="relative h-full overflow-y-auto">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_35%_at_50%_20%,rgba(61,220,151,0.10),transparent)]" />
      <div className="relative mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center gap-7 px-4 py-12 text-center sm:px-6">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="grid size-20 place-items-center rounded-full bg-verified/10 ring-1 ring-verified/40 shadow-[0_0_60px_rgba(61,220,151,0.25)]"
        >
          {firstCorrect ? <Trophy className="size-8 text-verified" aria-hidden /> : <CheckCheck className="size-8 text-verified" aria-hidden />}
        </motion.div>
        <div>
          <p className="hud-tag m-0 mb-3 text-verified">Training result</p>
          <h1 className="m-0 font-display text-title font-normal tracking-normal">{title}</h1>
          <p className="mx-auto mt-3 max-w-[46ch] text-[15px] leading-relaxed text-fg-muted">{body}</p>
        </div>

        <ol className="w-full rounded-2xl border border-line bg-surface/60 p-5 text-left" aria-label="What happened">
          {timeline.map((t, i) => {
            const Icon = t.icon;
            return (
              <motion.li
                key={t.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.12, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex gap-3 pb-5 last:pb-0"
              >
                {i < timeline.length - 1 && <span className="absolute bottom-0 left-[15px] top-8 w-px bg-line-strong" aria-hidden />}
                <span className={`grid size-8 shrink-0 place-items-center rounded-full ring-1 ${t.tone}`}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 pt-1">
                  <p className="m-0 text-[13.5px] font-medium text-fg">{t.label}</p>
                  <p className="m-0 mt-0.5 font-mono text-[11px] text-fg-faint">{t.detail}</p>
                </div>
              </motion.li>
            );
          })}
        </ol>

        {workMap?.guardrails && workMap.guardrails.length > 0 && (
          <figure className="w-full border-l-2 border-signal/70 pl-4 text-left">
            <figcaption className="hud-tag mb-1.5 text-signal">Key expert rule reinforced</figcaption>
            <blockquote className="m-0 font-display text-[22px] leading-[1.25] text-fg">{workMap.guardrails[0]}</blockquote>
          </figure>
        )}

        <button
          onClick={onFinish}
          className="focus-ring flex items-center gap-2 rounded-xl bg-signal px-6 py-3 text-[15px] font-medium text-signal-ink shadow-[0_0_32px_rgba(200,246,90,0.25)] transition hover:bg-[#d6ff78]"
        >
          Finish training session <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
