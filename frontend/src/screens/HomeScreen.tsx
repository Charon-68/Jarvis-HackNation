/**
 * P1-01 — Home / Start screen
 * Clean landing with session mode choice.
 */
import { useState } from "react";
import { useSession } from "../store/sessionStore";

export default function HomeScreen() {
  const { startExpertSession, startTrainingSession, state } = useSession();
  const [expertName, setExpertName] = useState("Jane Expert");
  const [traineeName, setTraineeName] = useState("New Hire");
  const [mode, setMode] = useState<"expert" | "training">("expert");

  const handleStart = async () => {
    if (mode === "expert") {
      await startExpertSession(expertName || "Expert");
    } else {
      await startTrainingSession(traineeName || "Trainee");
    }
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        padding: "40px 20px",
        background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 60%)",
      }}
    >
      {/* Logo / Hero */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            boxShadow: "0 0 32px rgba(99,102,241,0.5)",
            marginBottom: 20,
            fontSize: 32,
          }}
        >
          🎓
        </div>
        <h1 style={{ marginBottom: 8, fontSize: 28 }}>AI Apprentice</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 15, maxWidth: 400, lineHeight: 1.6 }}>
          Watch an expert work, capture their reasoning, and teach it to new hires.
        </p>
      </div>

      {/* Mode card */}
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 460,
          overflow: "visible",
        }}
      >
        <div style={{ padding: "24px 28px" }}>
          {/* Mode toggle */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 28,
              background: "var(--bg-raised)",
              padding: 4,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {(["expert", "training"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: "9px 12px",
                  borderRadius: "calc(var(--radius-md) - 2px)",
                  border: "none",
                  background: mode === m ? "var(--bg-active)" : "transparent",
                  color: mode === m ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: mode === m ? 600 : 400,
                  cursor: "pointer",
                  fontSize: 13,
                  transition: "all var(--transition-default)",
                  boxShadow: mode === m ? "var(--shadow-sm)" : "none",
                }}
              >
                {m === "expert" ? "🎤 Expert Capture" : "🎓 New Hire Training"}
              </button>
            ))}
          </div>

          {/* Fields */}
          {mode === "expert" ? (
            <div className="field-group" style={{ marginBottom: 24 }}>
              <label className="field-label" htmlFor="expert-name">Expert Name</label>
              <input
                id="expert-name"
                type="text"
                value={expertName}
                onChange={(e) => setExpertName(e.target.value)}
                placeholder="Your name"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                  fontSize: 13,
                  outline: "none",
                  transition: "border-color var(--transition-default)",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--brand-primary)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; }}
              />
            </div>
          ) : (
            <div className="field-group" style={{ marginBottom: 24 }}>
              <label className="field-label" htmlFor="trainee-name">Trainee Name</label>
              <input
                id="trainee-name"
                type="text"
                value={traineeName}
                onChange={(e) => setTraineeName(e.target.value)}
                placeholder="New hire name"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                  fontSize: 13,
                  outline: "none",
                  transition: "border-color var(--transition-default)",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--brand-primary)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; }}
              />
            </div>
          )}

          {/* Description */}
          <div
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "12px 14px",
              marginBottom: 20,
              fontSize: 12.5,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            {mode === "expert" ? (
              <>
                <strong style={{ color: "var(--text-primary)" }}>Expert Capture</strong>
                {" — "}Process support tickets T001 → T002 → T003 → T005 → T006 while the AI Apprentice observes and asks questions. Finish with a debrief to generate the Work Map.
              </>
            ) : (
              <>
                <strong style={{ color: "var(--text-primary)" }}>Training Mode</strong>
                {" — "}Tackle an unseen case with guidance from the trained AI tutor. The tutor will block unsafe decisions and guide you using the expert&apos;s learned knowledge.
              </>
            )}
          </div>

          {state.error && (
            <div
              style={{
                background: "var(--danger-dim)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                marginBottom: 16,
                fontSize: 13,
                color: "var(--danger)",
              }}
            >
              {state.error}
            </div>
          )}

          <button
            id="start-session-btn"
            className="btn btn-primary btn-lg"
            style={{ width: "100%" }}
            onClick={handleStart}
            disabled={state.loading}
          >
            {state.loading ? (
              <><span className="spinner" /> Starting…</>
            ) : (
              <>{mode === "expert" ? "Begin Expert Session" : "Begin Training Session"}</>
            )}
          </button>
        </div>
      </div>

      {/* Footer note */}
      <p style={{ marginTop: 24, fontSize: 11.5, color: "var(--text-muted)", textAlign: "center" }}>
        Support Ticket Triage — AI Apprentice Hackathon MVP
      </p>
    </div>
  );
}
