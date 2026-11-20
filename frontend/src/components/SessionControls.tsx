/**
 * P1-10 — Session Controls (bottom bar)
 * Start, Pause/Off Record, Resume, Stop, End Expert Task, Start Training.
 */
import { ArrowRight, Check, EyeOff, Pause, Play, Square } from "lucide-react";
import type { CaptureStatus } from "../types/index";

interface SessionControlsProps {
  phase: string;
  captureStatus: CaptureStatus;
  elapsed: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onEndExpertTask: () => void;
  onStartTraining: () => void;
  loading?: boolean;
}

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const STATUS_LABEL: Record<string, string> = {
  idle: "Ready",
  active: "Recording",
  paused: "Paused",
  stopped: "Stopped",
};

export default function SessionControls({
  phase,
  captureStatus,
  elapsed,
  onStart,
  onPause,
  onResume,
  onStop,
  onEndExpertTask,
  onStartTraining,
  loading,
}: SessionControlsProps) {
  const isCapturing = captureStatus === "active";
  const isPaused = captureStatus === "paused";
  const isStopped = captureStatus === "stopped" || phase === "debrief" || phase === "map_ready";

  const btn =
    "focus-ring flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition disabled:opacity-50";

  return (
    <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-t border-line bg-ink/80 px-3 backdrop-blur-xl sm:px-5">
      {/* Left: status */}
      <div className="flex min-w-0 items-center gap-2.5 sm:min-w-[170px]">
        <span className="relative flex size-2.5">
          {isCapturing && <span className="absolute inset-0 animate-ping rounded-full bg-signal/70" aria-hidden />}
          <span className={`relative size-2.5 rounded-full ${isCapturing ? "bg-signal" : isPaused ? "bg-amber" : "bg-fg-faint"}`} />
        </span>
        <span aria-live="polite" className={`hud-tag ${isCapturing ? "text-fg" : "text-fg-muted"}`}>{STATUS_LABEL[captureStatus] ?? captureStatus}</span>
        {(isCapturing || isPaused) && (
          <span
            className={`rounded-md px-2 py-0.5 font-mono text-[13px] font-medium tabular-nums ${
              isCapturing ? "bg-raised text-fg ring-1 ring-line" : "bg-amber/10 text-amber"
            }`}
          >
            {formatElapsed(elapsed)}
          </span>
        )}
      </div>

      {/* Center: actions */}
      <div className="flex items-center gap-2">
        {phase === "capturing" && captureStatus === "idle" && (
          <button id="start-capture-btn" className={`${btn} bg-signal text-signal-ink shadow-[0_0_24px_rgba(200,246,90,0.2)] hover:bg-[#d6ff78]`} onClick={onStart} disabled={loading}>
            <Play className="size-3.5 fill-current" aria-hidden /> Start recording
          </button>
        )}

        {isCapturing && (
          <button id="pause-capture-btn" className={`${btn} border border-amber/35 bg-amber/10 text-amber hover:bg-amber/15`} onClick={onPause}>
            <Pause className="size-3.5" aria-hidden /> <span className="max-sm:hidden">Pause /</span> Off record
          </button>
        )}

        {isPaused && (
          <button id="resume-capture-btn" className={`${btn} border border-signal/35 bg-signal/10 text-signal hover:bg-signal/15`} onClick={onResume}>
            <Play className="size-3.5" aria-hidden /> Resume
          </button>
        )}

        {(isCapturing || isPaused) && (
          <button id="stop-capture-btn" className={`${btn} border border-line-strong bg-raised text-fg hover:border-fg-faint`} onClick={onStop}>
            <Square className="size-3 fill-current" aria-hidden /> Stop
          </button>
        )}

        {captureStatus === "stopped" && phase === "capturing" && (
          <button id="end-expert-task-btn" className={`${btn} bg-fg text-ink hover:bg-white`} onClick={onEndExpertTask} disabled={loading}>
            {loading ? (
              <>
                <span className="size-3.5 animate-spin rounded-full border-2 border-signal-ink/30 border-t-signal-ink" /> Working…
              </>
            ) : (
              <>
                <Check className="size-4" aria-hidden /> End expert task
              </>
            )}
          </button>
        )}

        {phase === "map_ready" && (
          <button id="start-training-btn" className={`${btn} bg-fg text-ink hover:bg-white`} onClick={onStartTraining}>
            Start training <ArrowRight className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {/* Right: trust hint */}
      <div className="hidden min-w-[170px] items-center justify-end gap-1.5 text-[11px] text-fg-faint md:flex">
        <EyeOff className="size-3.5" aria-hidden />
        Pause any time to go off the record
      </div>
    </div>
  );
}
