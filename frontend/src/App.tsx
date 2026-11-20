/**
 * P1-01 — Application Shell
 *
 * Routes between phases:
 *   ready → capturing → debrief → map_ready → training → completed
 *
 * The original ElevenLabs prototype is preserved as "LegacyPrototype" and
 * accessible via the toggle in the top-right corner.
 */
import { lazy, Suspense, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import events from "../screen_events.json";

import { SessionProvider, useSession } from "./store/sessionStore";
import HomeScreen from "./screens/HomeScreen";
import CaptureWorkspace from "./screens/CaptureWorkspace";
import DebriefScreen from "./screens/DebriefScreen";
import WorkMapScreen from "./screens/WorkMapScreen";
import TrainingWorkspace from "./screens/TrainingWorkspace";
import { flag, navigate, useRoute } from "./lib/route";
import TopBar from "./components/shell/TopBar";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { CheckCheck, RotateCcw } from "lucide-react";

const Landing = lazy(() => import("./landing/Landing"));

// ---------------------------------------------------------------------------
// Phase router — inner component (needs session context)
// ---------------------------------------------------------------------------

function screenKey(phase: string, hasSession: boolean) {
  if (!hasSession || phase === "ready" || phase === "error") return "home";
  return phase;
}

function AppRouter() {
  const { state, resetSession, startTraining } = useSession();
  const { phase, session } = state;
  const key = screenKey(phase, !!session);

  let screen: React.ReactNode;
  switch (key) {
    case "capturing":
      screen = <CaptureWorkspace />;
      break;
    case "debrief":
      screen = <DebriefScreen />;
      break;
    case "map_ready":
      screen = <WorkMapScreen />;
      break;
    case "training":
      screen = <TrainingWorkspace />;
      break;
    case "completed":
      screen = <CompletedScreen onRestart={resetSession} />;
      break;
    default:
      screen = <HomeScreen />;
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-svh w-screen flex-col overflow-hidden bg-ink text-fg">
        <TopBar
          phase={phase}
          hasSession={!!session}
          participant={session?.mode === "training" ? session?.traineeName : session?.expertName}
          mode={session?.mode}
          onSkipToTraining={startTraining}
          onReset={resetSession}
        />
        <main className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={key}
              className="h-full"
              initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              {screen}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </MotionConfig>
  );
}

function CompletedScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-6 overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_50%_45%,rgba(200,246,90,0.10),transparent)]" />
      <div className="relative grid size-20 place-items-center rounded-full bg-signal/10 ring-1 ring-signal/40 shadow-[0_0_60px_rgba(200,246,90,0.25)]">
        <CheckCheck className="size-8 text-signal" aria-hidden />
      </div>
      <p className="hud-tag text-signal">Capture · Map · Teach complete</p>
      <h1 className="font-display text-title font-normal tracking-normal">Session complete</h1>
      <p className="max-w-md text-fg-muted">The AI Apprentice has captured the expert&apos;s workflow and taught it to a new hire.</p>
      <button className="btn btn-primary btn-lg mt-2" onClick={onRestart}>
        <RotateCcw className="size-4" aria-hidden /> Start a new session
      </button>
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

function parseLegacyParams(params: unknown): Record<string, any> {
  if (!params) return {};
  if (typeof params === "string") {
    try {
      return JSON.parse(params);
    } catch {
      return {};
    }
  }
  if (typeof params === "object") {
    return params as Record<string, any>;
  }
  return {};
}

function LegacyPrototype() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sent = useRef(new Set<string>());
  const [lastEvent, setLastEvent] = useState("No screen event sent yet.");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loggedDecisions, setLoggedDecisions] = useState<object[]>([]);

  const legacyClientTools = {
    get_ticket_context: (rawParams: unknown) => {
      const params = parseLegacyParams(rawParams);
      const ticketId = params.ticket_id || params.ticketId || params.id || "";
      const result = legacyTickets[ticketId] ?? { ticket_id: ticketId, error: "Ticket not found" };
      console.log("get_ticket_context", ticketId, result);
      return JSON.stringify(result);
    },
    getTicketContext: (rawParams: unknown) => {
      const params = parseLegacyParams(rawParams);
      const ticketId = params.ticket_id || params.ticketId || params.id || "";
      const result = legacyTickets[ticketId] ?? { ticket_id: ticketId, error: "Ticket not found" };
      return JSON.stringify(result);
    },
    log_expert_decision: (rawParams: unknown) => {
      const params = parseLegacyParams(rawParams);
      console.log("EXPERT DECISION", params);
      setLoggedDecisions((old) => [...old, params]);
      return JSON.stringify({ status: "logged", ...params });
    },
    logExpertDecision: (rawParams: unknown) => {
      const params = parseLegacyParams(rawParams);
      console.log("EXPERT DECISION", params);
      setLoggedDecisions((old) => [...old, params]);
      return JSON.stringify({ status: "logged", ...params });
    },
    trigger_debrief_summary: (rawParams: unknown) => {
      const params = parseLegacyParams(rawParams);
      console.log("DEBRIEF REQUEST", params);
      return JSON.stringify({ status: "synthesis_started", session_id: params.session_id || params.sessionId });
    },
    triggerDebriefSummary: (rawParams: unknown) => {
      const params = parseLegacyParams(rawParams);
      console.log("DEBRIEF REQUEST", params);
      return JSON.stringify({ status: "synthesis_started", session_id: params.session_id || params.sessionId });
    },
  };

  const conversation = useConversation({
    clientTools: legacyClientTools,
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
      await conversation.startSession({ agentId: AGENT_ID, clientTools: legacyClientTools });
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
  const route = useRoute();
  // The legacy ElevenLabs prototype is a dev/QA tool: only reachable via ?legacy=1.
  const legacyEnabled = flag("legacy") === "1";
  const [showLegacy, setShowLegacy] = useState(false);

  if (route === "landing" && !legacyEnabled) {
    return (
      <Suspense fallback={<div style={{ height: "100vh", background: "var(--bg-base)" }} />}>
        <Landing onLaunch={() => navigate("app")} />
      </Suspense>
    );
  }

  return (
    <>
      {legacyEnabled && (
        <button
          onClick={() => setShowLegacy((v) => !v)}
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 9999,
            fontSize: 11,
            padding: "6px 12px",
            background: showLegacy ? "var(--brand-primary)" : "var(--bg-raised)",
            color: showLegacy ? "#0b0d05" : "#fff",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 99,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {showLegacy ? "← New App" : "Legacy Prototype"}
        </button>
      )}

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
