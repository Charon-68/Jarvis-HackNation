/**
 * P1-11 — Debrief / Map Transition UI
 * Manages Debrief phase questions, Teach-Back confirmation,
 * Work Map generation loading/error/retry states, and phase transitions.
 */

import { useEffect, useState } from "react";
import { useSession } from "../store/sessionStore";

const DEBRIEF_QUESTIONS = [
  "Would you treat a login problem the same way if only one employee is affected?",
  "What changes if many customers report the same API error?",
  "What is the rule for possible data loss?",
  "When do you stop normal troubleshooting?",
];

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

  const progress = ((questionIdx + 1) / DEBRIEF_QUESTIONS.length) * 100;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        gap: 24,
        overflowY: "auto",
        background: "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.1) 0%, transparent 60%)",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", maxWidth: 540 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🗣️</div>
        <h1 style={{ marginBottom: 8, fontSize: 24 }}>Debrief & Teach-Back Session</h1>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, fontSize: 13.5 }}>
          The AI Apprentice is reviewing your decisions and verifying workflow guardrails.
          Confirm the teach-back summary before generating the Work Map.
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: 540 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Debrief Progress</span>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
            {questionIdx + 1} / {DEBRIEF_QUESTIONS.length}
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: "var(--bg-raised)",
            borderRadius: "var(--radius-pill)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
              borderRadius: "var(--radius-pill)",
              transition: "width 0.5s ease",
            }}
          />
        </div>
      </div>

      {/* Questions list */}
      <div className="card" style={{ width: "100%", maxWidth: 540 }}>
        <div style={{ padding: "20px 24px" }}>
          <h3 style={{ marginBottom: 16 }}>Follow-up Questions</h3>
          <div className="flex-col gap-3" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {DEBRIEF_QUESTIONS.map((q, i) => {
              const isAsked = i <= questionIdx;
              const isCurrent = i === questionIdx;
              return (
                <div
                  key={i}
                  className="fade-in"
                  style={{
                    display: "flex",
                    gap: 12,
                    opacity: isAsked ? 1 : 0.35,
                    transition: "opacity 0.5s ease",
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      background:
                        isAsked && !isCurrent
                          ? "var(--success-dim)"
                          : isCurrent
                          ? "var(--brand-primary-dim)"
                          : "var(--bg-raised)",
                      color:
                        isAsked && !isCurrent
                          ? "var(--success)"
                          : isCurrent
                          ? "var(--brand-primary)"
                          : "var(--text-muted)",
                      border: `1px solid ${
                        isAsked && !isCurrent
                          ? "rgba(16,185,129,0.3)"
                          : isCurrent
                          ? "var(--brand-primary-glow)"
                          : "var(--border-subtle)"
                      }`,
                    }}
                  >
                    {isAsked && !isCurrent ? "✓" : i + 1}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5, margin: 0 }}>
                      {q}
                    </p>
                    {isCurrent && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--brand-primary)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          marginTop: 4,
                        }}
                      >
                        <span className="status-dot active" style={{ width: 6, height: 6 }} />
                        Discussing now…
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Teach-back confirmation */}
      {allQuestionsAsked && !teachBackComplete && (
        <div className="card fade-in" style={{ width: "100%", maxWidth: 540 }}>
          <div style={{ padding: "20px 24px" }}>
            <h3 style={{ marginBottom: 12 }}>Teach-Back Confirmation</h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.6 }}>
              The AI Apprentice synthesized the following expert workflow rules. Does this accurately represent your triage decisions?
            </p>
            <blockquote
              style={{
                fontSize: 13,
                color: "var(--text-primary)",
                lineHeight: 1.7,
                borderLeft: "3px solid var(--brand-primary)",
                paddingLeft: 14,
                marginBottom: 20,
                fontStyle: "italic",
                background: "var(--bg-raised)",
                padding: "10px 14px",
                borderRadius: "0 8px 8px 0",
              }}
            >
              "I check impact scope first. Full outage or multi-customer API failure requires immediate P1 escalation. Single-user issues are routine support. If potential data loss is detected, I immediately STOP normal troubleshooting and escalate."
            </blockquote>
            <div className="flex gap-2" style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-success" onClick={() => setTeachBackComplete(true)}>
                ✓ Confirmed — Correct
              </button>
              <button className="btn btn-secondary" onClick={() => setTeachBackComplete(true)}>
                Modify / Adjust
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Work Map Generation Trigger / Loading / Error State */}
      {teachBackComplete && (
        <div className="flex-col fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--success-dim)",
              border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: "var(--radius-md)",
              padding: "12px 20px",
            }}
          >
            <span style={{ fontSize: 18 }}>✅</span>
            <span style={{ fontSize: 13, color: "var(--success)", fontWeight: 600 }}>
              Teach-back confirmed — Ready to synthesize Work Map
            </span>
          </div>

          <button
            id="generate-work-map-btn"
            className="btn btn-primary btn-lg"
            onClick={handleGenerateMap}
            disabled={generating || state.loading}
            style={{ minWidth: 240 }}
          >
            {generating || state.loading ? (
              <>
                <span className="spinner" /> Synthesizing Work Map…
              </>
            ) : (
              <>🗺️ Generate Work Map</>
            )}
          </button>
        </div>
      )}

      {/* Generation Error State with Retry Button */}
      {(generationError || state.error) && (
        <div
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            maxWidth: 540,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ color: "#f87171", fontWeight: 600, fontSize: 13 }}>
            ⚠️ Work Map Generation Failed: {generationError || state.error}
          </div>
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleGenerateMap}
            style={{ alignSelf: "flex-start" }}
          >
            🔄 Retry Generation
          </button>
        </div>
      )}
    </div>
  );
}
