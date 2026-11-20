/**
 * P1-12, P1-13 — Work Map Viewer & Evidence Replay
 * Graph view (React Flow, lazy) with a step inspector, plus an accessible
 * list view. Evidence replay opens for steps with a screenshotRef.
 */

import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BadgeCheck, CircleDashed, List, Network, OctagonAlert } from "lucide-react";
import { useSession } from "../store/sessionStore";
import type { WorkMapStep } from "../types/index";
import EvidenceReplayModal from "../components/EvidenceReplayModal";
import StepDetail from "../workmap/StepDetail";
import SignalOrb from "../components/SignalOrb";
import { rovingKeyDown } from "../lib/a11y";

const WorkMapGraph = lazy(() => import("../workmap/WorkMapGraph"));

const NARROW = "(max-width: 767px)";
function useNarrow() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(NARROW);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}

export default function WorkMapScreen() {
  const { state, startTraining } = useSession();
  const [selectedEvidenceStep, setSelectedEvidenceStep] = useState<WorkMapStep | null>(null);
  const [view, setView] = useState<"graph" | "list">("graph");
  const narrow = useNarrow();

  const workMap = state.workMap;
  const [expandedStepId, setExpandedStepId] = useState<string | null>(workMap?.steps?.[0]?.id || null);
  useEffect(() => {
    if (!expandedStepId && workMap?.steps?.[0]) setExpandedStepId(workMap.steps[0].id);
  }, [workMap, expandedStepId]);

  if (!workMap) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5">
        <SignalOrb state="speaking" size={96} />
        <p className="hud-tag text-signal">Synthesizing Work Map…</p>
      </div>
    );
  }

  const activeStep = workMap.steps.find((s) => s.id === expandedStepId) || null;
  const guardrailCount = workMap.steps.reduce((n, s) => n + s.guardrails.length, 0);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b border-line px-4 py-3.5 sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="m-0 font-display text-[28px] font-normal leading-none tracking-normal text-fg">Work Map</h1>
            {workMap.confirmedByExpert ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-verified/10 px-2 py-0.5 text-[11px] font-medium text-verified ring-1 ring-verified/30">
                <BadgeCheck className="size-3.5" aria-hidden /> Expert confirmed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber/10 px-2 py-0.5 text-[11px] font-medium text-amber ring-1 ring-amber/30">
                <CircleDashed className="size-3.5" aria-hidden /> Unconfirmed
              </span>
            )}
          </div>
          <p className="mt-1.5 font-mono text-[11px] text-fg-faint">
            {workMap.expertName || "Triage practitioner"} · {workMap.steps.length} steps · {guardrailCount} guardrails
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div
            role="tablist"
            aria-label="Work Map view"
            className="flex rounded-lg border border-line bg-raised/60 p-0.5"
            onKeyDown={(e) => rovingKeyDown(e, ["graph", "list"] as const, view, setView)}
          >
            {(
              [
                ["graph", "Graph", Network],
                ["list", "List", List],
              ] as const
            ).map(([k, label, Icon]) => (
              <button
                key={k}
                role="tab"
                aria-selected={view === k}
                aria-controls="workmap-view"
                id={`workmap-tab-${k}`}
                tabIndex={view === k ? 0 : -1}
                onClick={() => setView(k)}
                className={`focus-ring flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                  view === k ? "bg-ink text-fg ring-1 ring-line-strong" : "text-fg-muted hover:text-fg"
                }`}
              >
                <Icon className={`size-3.5 ${view === k ? "text-signal" : ""}`} aria-hidden />
                {label}
              </button>
            ))}
          </div>
          <button
            id="start-training-from-map-btn"
            onClick={startTraining}
            className="focus-ring group flex items-center gap-1.5 rounded-lg bg-fg px-3.5 py-2 text-[13px] font-medium text-ink transition hover:bg-white"
          >
            Start training <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {(workMap.summary || (workMap.guardrails && workMap.guardrails.length > 0)) && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-ink/40 px-4 py-2.5 sm:px-6">
          {workMap.summary && <p className="m-0 w-full max-w-[80ch] text-[12.5px] leading-snug text-fg-muted [overflow-wrap:anywhere]">{workMap.summary}</p>}
          {workMap.guardrails?.map((g) => (
            <span key={g} className="flex items-center gap-1.5 rounded-full border border-stop/30 bg-stop/[0.06] px-2.5 py-1 text-[11px] text-[#ffd2cc]">
              <OctagonAlert className="size-3 text-stop" aria-hidden />
              {g}
            </span>
          ))}
        </div>
      )}

      {/* Body */}
      <AnimatePresence mode="wait" initial={false}>
        {view === "graph" ? (
          <motion.div
            key="graph"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            id="workmap-view"
            role="tabpanel"
            aria-labelledby="workmap-tab-graph"
            className="grid min-h-0 flex-1 max-md:overflow-y-auto md:grid-cols-[minmax(0,1fr)_380px]"
          >
            <div className="relative min-h-[58svh] md:min-h-0">
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_50%_at_40%_40%,rgba(200,246,90,0.05),transparent)]" />
              <Suspense
                fallback={
                  <div className="grid h-full place-items-center">
                    <span className="hud-tag text-fg-faint">Loading graph…</span>
                  </div>
                }
              >
                <WorkMapGraph map={workMap} selectedId={expandedStepId} onSelect={setExpandedStepId} vertical={narrow} />
              </Suspense>
            </div>
            <aside aria-label="Step details" className="min-h-0 overflow-y-auto border-line bg-surface/50 px-5 py-5 md:border-l max-md:border-t">
              <AnimatePresence mode="wait">
                {activeStep ? (
                  <motion.div
                    key={activeStep.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <StepDetail step={activeStep} onEvidence={setSelectedEvidenceStep} />
                  </motion.div>
                ) : (
                  <p className="text-sm text-fg-muted">Select a step in the graph to see the expert&apos;s reasoning.</p>
                )}
              </AnimatePresence>
            </aside>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            id="workmap-view"
            role="tabpanel"
            aria-labelledby="workmap-tab-list"
            className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6"
          >
            <ol aria-label="Work Map steps" className="mx-auto flex max-w-3xl flex-col gap-4">
              {workMap.steps.map((s) => (
                <li key={s.id} className="rounded-2xl border border-line bg-surface/60 p-5">
                  <StepDetail step={s} onEvidence={setSelectedEvidenceStep} headingLevel={3} />
                </li>
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>

      <EvidenceReplayModal step={selectedEvidenceStep} onClose={() => setSelectedEvidenceStep(null)} />
    </div>
  );
}
