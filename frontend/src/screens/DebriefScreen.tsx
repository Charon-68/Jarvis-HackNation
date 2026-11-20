/**
 * P1-11 — Debrief / Map Transition UI
 * Manages Debrief phase questions, Teach-Back confirmation,
 * Work Map generation loading/error/retry states, and phase transitions.
 * (Logic unchanged in M6; presentation redesigned.)
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, CheckCircle2, Network, PencilLine, RotateCcw, TriangleAlert } from "lucide-react";
import { useSession } from "../store/sessionStore";
import SignalOrb from "../components/SignalOrb";

const DEBRIEF_QUESTIONS = [
  "Would you treat a login problem the same way if only one employee is affected?",
  "What changes if many customers report the same API error?",
  "What is the rule for possible data loss?",
  "When do you stop normal troubleshooting?",
];

const TEACH_BACK =
  "I check impact scope first. Full outage or multi-customer API failure requires immediate P1 escalation. Single-user issues are routine support. If potential data loss is detected, I immediately STOP normal troubleshooting and escalate.";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function DebriefScreen() {
  const { state, generateWorkMap } = useSession();
  const [questionIdx, setQuestionIdx] = useState(0);
  const [teachBackComplete, setTeachBackComplete] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Simulate debrief question progression
  useEffect(() => {
    const timer = setInterval(() => {
      setQuestionIdx((prev) => {
        if (prev < DEBRIEF_QUESTIONS.length - 1) return prev + 1;
        clearInterval(timer);
        return prev;
      });
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const allQuestionsAsked = questionIdx >= DEBRIEF_QUESTIONS.length - 1;

  const handleGenerateMap = async () => {
    setGenerating(true);
    setGenerationError(null);

    try {
      await generateWorkMap();
    } catch (err: unknown) {
      setGenerationError((err as Error).message || "Failed to generate Work Map. Please retry.");
    } finally {
      setGenerating(false);
    }
  };

  const busy = generating || state.loading;
  const stage = busy ? "Synthesizing" : teachBackComplete ? "Ready" : allQuestionsAsked ? "Teach-back" : "Asking follow-ups";
  const orbState = busy ? "speaking" : allQuestionsAsked ? "listening" : "speaking";
  const error = generationError || state.error;

  return (
    <div className="relative h-full overflow-y-auto">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_40%_at_25%_40%,rgba(200,246,90,0.08),transparent)]" />
      <div className="relative mx-auto grid min-h-full max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        {/* Presence */}
        <div className="flex flex-col items-start gap-6 max-lg:items-center max-lg:text-center">
          <SignalOrb state={orbState} size={150} className="max-sm:!size-[110px]" />
          <div>
            <p className="hud-tag mb-3 text-signal" aria-live="polite">
              ● Debrief · {stage}
            </p>
            <h1 className="m-0 max-w-[16ch] font-display text-title font-normal tracking-normal">Debrief and <span className="whitespace-nowrap">teach-back</span></h1>
            <p className="mt-4 max-w-[42ch] text-[14px] leading-relaxed text-fg-muted">
              The AI Apprentice is reviewing your decisions and verifying workflow guardrails. Confirm the teach-back summary before generating the Work Map.
            </p>
          </div>
          {/* Progress */}
          <div className="w-full max-w-sm">
            <div className="mb-2 flex justify-between font-mono text-[11px] text-fg-faint">
              <span>Follow-up questions</span>
              <span className="text-fg-muted">
                {questionIdx + 1} / {DEBRIEF_QUESTIONS.length}
              </span>
            </div>
            <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={DEBRIEF_QUESTIONS.length} aria-valuenow={questionIdx + 1}>
              {DEBRIEF_QUESTIONS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= questionIdx ? "bg-signal" : "bg-line-strong"}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Conversation */}
        <div className="flex flex-col gap-4">
          <ol className="glass flex flex-col gap-1 rounded-2xl p-3 sm:p-4" aria-label="Follow-up questions">
            {DEBRIEF_QUESTIONS.map((q, i) => {
              const isAsked = i <= questionIdx;
              const isCurrent = i === questionIdx && !allQuestionsAsked;
              const done = isAsked && !isCurrent;
              return (
                <li
                  key={q}
                  className={`flex gap-3 rounded-xl px-3 py-3 transition-all duration-500 ${isCurrent ? "bg-signal/[0.06] ring-1 ring-signal/25" : ""} ${
                    isAsked ? "opacity-100" : "opacity-35"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full font-mono text-[11px] ${
                      done ? "bg-verified/15 text-verified" : isCurrent ? "bg-signal text-signal-ink" : "bg-raised text-fg-faint ring-1 ring-line"
                    }`}
                  >
                    {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className={`m-0 leading-snug ${isCurrent ? "font-display text-[19px] text-fg" : "text-[13.5px] text-fg-muted"}`}>{q}</p>
                    {isCurrent && (
                      <span className="hud-tag mt-1.5 flex items-center gap-1.5 text-signal">
                        <span className="size-1.5 animate-pulse rounded-full bg-signal" aria-hidden /> Discussing now…
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          <AnimatePresence mode="wait">
            {/* Teach-back confirmation */}
            {allQuestionsAsked && !teachBackComplete && (
              <motion.section
                key="teachback"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: EASE }}
                className="rounded-2xl border border-signal/30 bg-[#11150a]/80 p-5 sm:p-6"
                aria-labelledby="teachback-title"
              >
                <h2 id="teachback-title" className="hud-tag m-0 text-signal">
                  Teach-back · the Apprentice explains it back
                </h2>
                <blockquote className="mt-4 border-l-2 border-signal/70 pl-4 font-display text-[21px] leading-[1.3] text-fg">
                  &ldquo;{TEACH_BACK}&rdquo;
                </blockquote>
                <p className="mt-4 text-[13px] text-fg-muted">Does this accurately represent your triage decisions?</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setTeachBackComplete(true)}
                    className="focus-ring flex items-center gap-1.5 rounded-lg bg-signal px-4 py-2 text-[13px] font-medium text-signal-ink transition hover:bg-[#d6ff78]"
                  >
                    <Check className="size-4" aria-hidden /> Confirmed, correct
                  </button>
                  <button
                    onClick={() => setTeachBackComplete(true)}
                    className="focus-ring flex items-center gap-1.5 rounded-lg border border-line-strong bg-raised px-4 py-2 text-[13px] text-fg transition hover:border-fg-faint"
                  >
                    <PencilLine className="size-4" aria-hidden /> Modify / adjust
                  </button>
                </div>
              </motion.section>
            )}

            {/* Generate */}
            {teachBackComplete && (
              <motion.section
                key="generate"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
                className="flex flex-col gap-4 rounded-2xl border border-line bg-surface/60 p-5 sm:p-6"
              >
                <p className="m-0 flex items-center gap-2 text-[13px] font-medium text-verified">
                  <CheckCircle2 className="size-4" aria-hidden /> Teach-back confirmed. Ready to synthesize the Work Map.
                </p>
                <button
                  id="generate-work-map-btn"
                  onClick={handleGenerateMap}
                  disabled={busy}
                  className="focus-ring flex items-center justify-center gap-2 self-start rounded-xl bg-signal px-5 py-3 text-[15px] font-medium text-signal-ink shadow-[0_0_28px_rgba(200,246,90,0.22)] transition hover:bg-[#d6ff78] disabled:cursor-wait disabled:opacity-70"
                >
                  {busy ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-signal-ink/30 border-t-signal-ink" /> Synthesizing Work Map…
                    </>
                  ) : (
                    <>
                      <Network className="size-4" aria-hidden /> Generate Work Map
                    </>
                  )}
                </button>
              </motion.section>
            )}
          </AnimatePresence>

          {error && (
            <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-stop/35 bg-stop/[0.07] p-4">
              <p className="m-0 flex items-start gap-2 text-[13px] font-medium text-stop">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> Work Map generation failed: {error}
              </p>
              <button
                onClick={handleGenerateMap}
                className="focus-ring flex items-center gap-1.5 self-start rounded-lg border border-line-strong bg-raised px-3 py-1.5 text-xs text-fg"
              >
                <RotateCcw className="size-3.5" aria-hidden /> Retry generation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
