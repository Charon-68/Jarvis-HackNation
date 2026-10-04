/**
 * P1-10 — Session Controls (bottom bar)
 * Start, Pause/Off Record, Resume, Stop, End Expert Task, Start Training.
 */
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

  return (
    <div
      style={{
        height: 60,
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        gap: 12,
        flexShrink: 0,
      }}
    >
      {/* Left: Status indicator */}
      <div className="flex items-center gap-3" style={{ minWidth: 160 }}>
        <span className={`status-dot ${isCapturing ? "active" : isPaused ? "paused" : "idle"}`} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
          {STATUS_LABEL[captureStatus] ?? captureStatus}
        </span>
        {(isCapturing || isPaused) && (
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 13,
              fontWeight: 700,
              color: isCapturing ? "var(--capture-active)" : "var(--capture-paused)",
              background: isCapturing ? "var(--success-dim)" : "var(--warning-dim)",
              padding: "2px 10px",
              borderRadius: "var(--radius-pill)",
            }}
          >
            {formatElapsed(elapsed)}
          </span>
        )}
      </div>

      {/* Center: Action buttons */}
      <div className="flex items-center gap-2">
        {/* ready → start */}
        {phase === "capturing" && captureStatus === "idle" && (
          <button
            id="start-capture-btn"
            className="btn btn-primary"
            onClick={onStart}
            disabled={loading}
          >
            <span>▶</span> Start Recording
          </button>
        )}

        {/* active → pause */}
        {isCapturing && (
          <button
            id="pause-capture-btn"
            className="btn btn-warning"
            onClick={onPause}
          >
            <span>⏸</span> Pause / Off Record
          </button>
        )}

        {/* paused → resume */}
        {isPaused && (
          <button
            id="resume-capture-btn"
            className="btn btn-success"
            onClick={onResume}
          >
            <span>▶</span> Resume
          </button>
        )}

        {/* active/paused → stop */}
        {(isCapturing || isPaused) && (
          <button
            id="stop-capture-btn"
            className="btn btn-secondary"
            onClick={onStop}
          >
            <span>⏹</span> Stop
          </button>
        )}

        {/* stopped → end expert task → debrief */}
        {captureStatus === "stopped" && phase === "capturing" && (
          <button
            id="end-expert-task-btn"
            className="btn btn-primary"
            onClick={onEndExpertTask}
            disabled={loading}
          >
            {loading ? <><span className="spinner" /> Working…</> : <>✓ End Expert Task</>}
          </button>
        )}

        {/* map_ready → start training */}
        {phase === "map_ready" && (
          <button
            id="start-training-btn"
            className="btn btn-primary"
            onClick={onStartTraining}
          >
            🎓 Start Training
          </button>
        )}
      </div>

      {/* Right: Phase indicator */}
      <div style={{ minWidth: 160, display: "flex", justifyContent: "flex-end" }}>
        <PhaseIndicator phase={phase} />
      </div>
    </div>
  );
}

function PhaseIndicator({ phase }: { phase: string }) {
  const phases: Array<{ key: string; label: string }> = [
    { key: "capturing", label: "Capture" },
    { key: "debrief", label: "Debrief" },
    { key: "map_ready", label: "Work Map" },
    { key: "training", label: "Training" },
    { key: "completed", label: "Done" },
  ];

  const currentIdx = phases.findIndex((p) => p.key === phase);

  return (
    <div className="flex items-center gap-1">
      {phases.map((p, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        return (
          <div
            key={p.key}
            title={p.label}
            style={{
              width: isActive ? 28 : 8,
              height: 6,
              borderRadius: "var(--radius-pill)",
              background: isDone
                ? "var(--success)"
                : isActive
                ? "var(--brand-primary)"
                : "var(--border-default)",
              transition: "all var(--transition-default)",
              flexShrink: 0,
            }}
          />
        );
      })}
      <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6, whiteSpace: "nowrap" }}>
        {phases.find((p) => p.key === phase)?.label ?? phase}
      </span>
    </div>
  );
}
