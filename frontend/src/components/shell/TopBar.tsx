/**
 * Console top bar: wordmark, stage stepper (Capture → Debrief → Map → Teach),
 * participant chip and session actions.
 */
import { Check, RotateCcw, SkipForward } from "lucide-react";
import type { SessionPhase } from "@/types";
import { navigate } from "@/lib/route";

const STAGES = [
  { label: "Capture", phases: ["capturing"] },
  { label: "Debrief", phases: ["debrief"] },
  { label: "Map", phases: ["map_ready"] },
  { label: "Teach", phases: ["training"] },
] as const;

export function stageIndex(phase: SessionPhase | undefined): number {
  if (!phase) return -1;
  if (phase === "completed") return STAGES.length;
  return STAGES.findIndex((s) => (s.phases as readonly string[]).includes(phase));
}

interface Props {
  phase: SessionPhase;
  hasSession: boolean;
  participant?: string;
  mode?: "expert" | "training";
  onSkipToTraining?: () => void;
  onReset: () => void;
}

export default function TopBar({ phase, hasSession, participant, mode, onSkipToTraining, onReset }: Props) {
  const current = hasSession ? stageIndex(phase) : -1;

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-ink/80 px-3 backdrop-blur-xl sm:px-5">
      <button
        onClick={() => navigate("landing")}
        className="focus-ring flex items-center gap-2 rounded-md py-1 pr-1 text-sm font-medium tracking-tight text-fg"
        title="Back to the landing page"
      >
        <span className="size-2.5 rounded-full bg-signal shadow-[0_0_12px_2px_rgba(200,246,90,0.55)]" />
        <span className="max-sm:hidden">AI Apprentice</span>
      </button>
      <span className="hud-tag text-fg-faint max-lg:hidden">Support triage</span>

      {/* Stage stepper */}
      <nav aria-label="Session stages" className="mx-auto flex min-w-0 items-center">
        <ol className="flex items-center gap-1 sm:gap-2">
          {STAGES.map((s, i) => {
            const done = current > i;
            const active = current === i;
            return (
              <li key={s.label} className="flex items-center gap-1 sm:gap-2">
                <span
                  aria-current={active ? "step" : undefined}
                  className={`hud-tag flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors duration-300 sm:px-2.5 ${
                    active
                      ? "bg-signal/12 text-signal ring-1 ring-signal/35"
                      : done
                        ? "text-fg-muted"
                        : "text-fg-faint"
                  }`}
                >
                  {done ? (
                    <Check className="size-3 text-signal" aria-hidden />
                  ) : (
                    <span
                      className={`size-1.5 rounded-full ${active ? "bg-signal shadow-[0_0_8px_rgba(200,246,90,0.9)]" : "bg-fg-faint/70"}`}
                    />
                  )}
                  <span className={active ? "" : "max-md:hidden"}>{s.label}</span>
                  <span className="sr-only">{done ? " (done)" : active ? " (current)" : ""}</span>
                </span>
                {i < STAGES.length - 1 && <span className="h-px w-3 bg-line-strong sm:w-6" aria-hidden />}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex items-center gap-2">
        {hasSession && participant && (
          <span className="hidden items-center gap-2 rounded-full border border-line bg-raised px-2.5 py-1 text-xs text-fg-muted xl:flex">
            <span className="hud-tag text-fg-faint">{mode === "training" ? "Trainee" : "Expert"}</span>
            {participant}
          </span>
        )}
        {phase === "map_ready" && onSkipToTraining && (
          <button
            onClick={onSkipToTraining}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-line bg-raised px-2.5 py-1.5 text-xs text-fg transition hover:border-line-strong"
          >
            <SkipForward className="size-3.5" aria-hidden />
            <span className="max-sm:hidden">Skip to training</span>
          </button>
        )}
        {hasSession && (
          <button
            onClick={onReset}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-line bg-raised px-2.5 py-1.5 text-xs text-fg-muted transition hover:border-line-strong hover:text-fg"
            title="Reset session"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            <span className="max-sm:hidden">Reset</span>
          </button>
        )}
      </div>
    </header>
  );
}
