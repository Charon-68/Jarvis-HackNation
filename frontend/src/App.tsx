/**
 * P1-01 — Application Shell
 *
 * Routes between phases:
 *   ready → capturing → debrief → map_ready → training → completed
 *
 * The original ElevenLabs prototype is preserved as "LegacyPrototype" and
 * accessible via the toggle in the top-right corner.
 */
import "./index.css";

import { useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import events from "../screen_events.json";

import { SessionProvider, useSession } from "./store/sessionStore";
import HomeScreen from "./screens/HomeScreen";
import CaptureWorkspace from "./screens/CaptureWorkspace";
import DebriefScreen from "./screens/DebriefScreen";
import WorkMapScreen from "./screens/WorkMapScreen";
import TrainingWorkspace from "./screens/TrainingWorkspace";

// ---------------------------------------------------------------------------
// Phase router — inner component (needs session context)
// ---------------------------------------------------------------------------

function AppRouter() {
  const { state, resetSession, startTraining } = useSession();
  const { phase, session } = state;

  // Decide which screen to show
  let screen: React.ReactNode;

  if (!session || phase === "ready" || phase === "error") {
    screen = <HomeScreen />;
  } else if (phase === "capturing") {
    screen = <CaptureWorkspace />;
  } else if (phase === "debrief") {
    screen = <DebriefScreen />;
  } else if (phase === "map_ready") {
    screen = <WorkMapScreen />;
  } else if (phase === "training") {
    screen = <TrainingWorkspace />;
  } else if (phase === "completed") {
    screen = (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ fontSize: 56 }}>🎉</div>
        <h1>Session Complete</h1>
        <p style={{ color: "var(--text-secondary)" }}>The AI Apprentice has captured and taught the workflow.</p>
        <button className="btn btn-primary" onClick={resetSession}>
          Start New Session
        </button>
      </div>
    );
  } else {
    screen = <HomeScreen />;
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg-base)",
      }}
    >
      {/* Top bar */}
      <header
        style={{
          height: 52,
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span
            style={{
              fontSize: 18,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: 800,
            }}
          >
            ✦
          </span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>AI Apprentice</span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              background: "var(--bg-raised)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-pill)",
              padding: "2px 8px",
              marginLeft: 4,
            }}
          >
            Support Ticket Triage
          </span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Phase badge */}
          {session && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--brand-primary)",
                background: "var(--brand-primary-dim)",
                border: "1px solid var(--brand-primary-glow)",
                borderRadius: "var(--radius-pill)",
                padding: "3px 10px",
              }}
            >
              {phase.replace("_", " ").toUpperCase()}
            </span>
          )}

          {/* Go to Training (shortcut) */}
          {phase === "map_ready" && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={startTraining}
            >
              Skip → Training
            </button>
          )}

          {/* Reset */}
          {session && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={resetSession}
              title="Reset session"
            >
              ↺ Reset
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "hidden" }}>
        {screen}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legacy ElevenLabs prototype (preserved, togglable)
// ---------------------------------------------------------------------------

const AGENT_ID = "agent_9501m425131dfx5tmyks9aq9a003";

const legacyTickets: Record<string, object> = {
  T001: { ticket_id: "T001", customer: "ABC Corp", issue: "Production website completely down", scope: "All customers", priority: "P1", team: "Infrastructure", action: "Immediate escalation" },
  T002: { ticket_id: "T002", customer: "XYZ Ltd", issue: "One employee cannot log in", scope: "Single user", priority: "P3", team: "Support", action: "Normal troubleshooting" },
  T003: { ticket_id: "T003", customer: "PQR Inc", issue: "Customer data disappeared after today's update", scope: "Potential data loss", priority: "P1", team: "Engineering", action: "STOP + escalate" },
  T004: { ticket_id: "T004", customer: "DEF Ltd", issue: "Password reset request", scope: "Single user", priority: "P3", team: "Support", action: "Send reset procedure" },
  T005: { ticket_id: "T005", customer: "LMN Corp", issue: "API returning errors for many customers", scope: "Multiple customers", priority: "P1", team: "Engineering", action: "Immediate engineering escalation" },
  T006: { ticket_id: "T006", customer: "QRS Ltd", issue: "Dashboard is slow for several customers", scope: "Multiple customers", priority: "P2", team: "Engineering", action: "Investigate performance" },
};

function LegacyPrototype() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sent = useRef(new Set<string>());
  const [lastEvent, setLastEvent] = useState("No screen event sent yet.");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loggedDecisions, setLoggedDecisions] = useState<object[]>([]);

  const conversation = useConversation({
    clientTools: {
      get_ticket_context: (params: { ticket_id: string }) => {
        const result = legacyTickets[params.ticket_id] ?? { ticket_id: params.ticket_id, error: "Ticket not found" };
        console.log("get_ticket_context", params.ticket_id, result);
        return JSON.stringify(result);
      },
      log_expert_decision: (params: { ticket_id: string; action_taken: string; decision_rationale: string }) => {
        console.log("EXPERT DECISION", params);
        setLoggedDecisions((old) => [...old, params]);
        return JSON.stringify({ status: "logged", ...params });
      },
      trigger_debrief_summary: (params: { session_id: string; tickets_processed: number }) => {
        console.log("DEBRIEF REQUEST", params);
        return JSON.stringify({ status: "synthesis_started", session_id: params.session_id });
      },
    },
    onConnect: () => console.log("ElevenLabs connected"),
    onDisconnect: () => console.log("ElevenLabs disconnected"),
    onError: (err) => console.error("ElevenLabs error", err),
  });

  const sendDueEvents = (currentTime: number) => {
    if (conversation.status !== "connected") return;
    for (const rawEvent of events.events) {
      const event = rawEvent as { timestamp: number; event_id: string; ticket_id?: string; context?: Record<string, string>; action?: { type: string; value?: string }; question_candidate?: boolean };
      if (event.timestamp <= currentTime && !sent.current.has(event.event_id)) {
        const action = event.action?.type
          ? `${event.action.type.replace(/_/g, " ")}${event.action.value ? ` → ${event.action.value}` : ""}`
          : "No explicit action";
        const text =
          `[SCREEN] ${formatTime(event.timestamp)} — ` +
          `${event.ticket_id ? `Ticket ${event.ticket_id}. ` : ""}` +
          `${event.context?.customer ? `Customer: ${event.context.customer}. ` : ""}` +
          `${event.context?.issue ? `Issue: ${event.context.issue}. ` : ""}` +
          `${event.context?.scope ? `Scope: ${event.context.scope}. ` : ""}` +
          `Expert action: ${action}. ` +
          `${event.question_candidate ? "This is a potentially meaningful decision; consider asking about the reasoning when appropriate." : ""}`;
        conversation.sendContextualUpdate(text);
        sent.current.add(event.event_id);
        setLastEvent(text);
      }
    }
  };

  const handleTimeUpdate = () => { sendDueEvents(videoRef.current?.currentTime ?? 0); };

  const start = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({ agentId: AGENT_ID });
      const id = conversation.getId();
      setSessionId(id);
      console.log("Conversation ID:", id);
    } catch (error) {
      console.error("Failed to start ElevenLabs session", error);
      alert("Could not start the ElevenLabs session. Check microphone permission and the agent configuration.");
    }
  };

  const resetAll = () => {
    sent.current.clear();
    setLastEvent("Event queue reset.");
    if (videoRef.current) videoRef.current.currentTime = 0;
  };

  const seekAndSync = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    for (const rawEvent of events.events) {
      const event = rawEvent as { timestamp: number; event_id: string };
      if (event.timestamp < seconds) sent.current.add(event.event_id);
      else sent.current.delete(event.event_id);
    }
    setLastEvent(`Seeked to ${formatTime(seconds)}. Future events will continue from here.`);
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 1200, margin: "0 auto", padding: 24, color: "var(--text-primary)" }}>
      <h1>AI Apprentice — ElevenLabs Capture MVP (Legacy Prototype)</h1>
      <p style={{ color: "#555" }}>
        The MP4 is the visual reference. The app sends only lightweight [SCREEN] contextual updates to your existing ElevenLabs agent.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, alignItems: "start" }}>
        <section>
          <video
            ref={videoRef}
            src="/AI_Apprentice_Support_Triage_Demo.mp4"
            controls
            width="100%"
            onTimeUpdate={handleTimeUpdate}
            style={{ borderRadius: 12, background: "#111" }}
          />
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={resetAll}>Reset</button>
            <button onClick={() => seekAndSync(8)}>Jump T001</button>
            <button onClick={() => seekAndSync(50)}>Jump T003</button>
          </div>
        </section>
        <aside style={{ border: "1px solid #ddd", borderRadius: 12, padding: 18 }}>
          <h2>ElevenLabs Agent</h2>
          <p><b>Agent ID:</b><br /><code>{AGENT_ID}</code></p>
          <p><b>Status:</b> {conversation.status}</p>
          <p><b>Mode:</b> {conversation.isSpeaking ? "Speaking" : "Listening"}</p>
          <p><b>Conversation ID:</b> {sessionId ?? "—"}</p>
          <button onClick={conversation.status === "connected" ? conversation.endSession : start} style={{ padding: "10px 14px", cursor: "pointer" }}>
            {conversation.status === "connected" ? "End Apprentice Session" : "Start Apprentice"}
          </button>
          <h3>Last [SCREEN] update</h3>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#f6f6f6", color: "#333", padding: 10, borderRadius: 8 }}>
            {lastEvent}
          </pre>
          <h3>Logged decisions</h3>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, maxHeight: 220, overflow: "auto", color: "#333", background: "#f6f6f6", padding: 8, borderRadius: 8 }}>
            {JSON.stringify(loggedDecisions, null, 2)}
          </pre>
        </aside>
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ---------------------------------------------------------------------------
// Root app — toggle between new product and legacy prototype
// ---------------------------------------------------------------------------

export default function App() {
  const [showLegacy, setShowLegacy] = useState(false);

  return (
    <>
      {/* Legacy toggle button (always visible) */}
      <button
        onClick={() => setShowLegacy((v) => !v)}
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 9999,
          fontSize: 11,
          padding: "6px 12px",
          background: showLegacy ? "#6366f1" : "#1a1d27",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 99,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {showLegacy ? "← New App" : "Legacy Prototype"}
      </button>

      {showLegacy ? (
        <LegacyPrototype />
      ) : (
        <SessionProvider>
          <AppRouter />
        </SessionProvider>
      )}
    </>
  );
}
