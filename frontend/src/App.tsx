import { useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import events from "../screen_events.json";
import { Timeline } from "./Timeline";

// Load Agent ID from environment variables instead of hardcoding
const AGENT_ID = import.meta.env.VITE_ELEVENLABS_APPRENTICE_AGENT_ID || "";

const tickets: Record<string, object> = {
  T001: { ticket_id: "T001", customer: "ABC Corp", issue: "Production website completely down", scope: "All customers", priority: "P1", team: "Infrastructure", action: "Immediate escalation" },
  T002: { ticket_id: "T002", customer: "XYZ Ltd", issue: "One employee cannot log in", scope: "Single user", priority: "P3", team: "Support", action: "Normal troubleshooting" },
  T003: { ticket_id: "T003", customer: "PQR Inc", issue: "Customer data disappeared after today's update", scope: "Potential data loss", priority: "P1", team: "Engineering", action: "STOP + escalate" },
  T004: { ticket_id: "T004", customer: "DEF Ltd", issue: "Password reset request", scope: "Single user", priority: "P3", team: "Support", action: "Send reset procedure" },
  T005: { ticket_id: "T005", customer: "LMN Corp", issue: "API returning errors for many customers", scope: "Multiple customers", priority: "P1", team: "Engineering", action: "Immediate engineering escalation" },
  T006: { ticket_id: "T006", customer: "QRS Ltd", issue: "Dashboard is slow for several customers", scope: "Multiple customers", priority: "P2", team: "Engineering", action: "Investigate performance" }
};

function Apprentice() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sent = useRef(new Set<string>());
  const [lastEvent, setLastEvent] = useState("No screen event sent yet.");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loggedDecisions, setLoggedDecisions] = useState<object[]>([]);

  const conversation = useConversation({
    clientTools: {
      // Must match the Client Tool name configured in the ElevenLabs dashboard exactly.
      get_ticket_context: (params: { ticket_id: string }) => {
        const result = tickets[params.ticket_id] ?? { ticket_id: params.ticket_id, error: "Ticket not found" };
        console.log("get_ticket_context", params.ticket_id, result);
        return JSON.stringify(result);
      },

      // Must match the Client Tool name + parameter names in ElevenLabs exactly.
      log_expert_decision: (params: {
        ticket_id: string;
        action_taken: string;
        decision_rationale: string;
      }) => {
        console.log("EXPERT DECISION", params);
        setLoggedDecisions((old) => [...old, params]);
        return JSON.stringify({ status: "logged", ...params });
      },

      // Optional but included because it was part of your teammate's original SDK design.
      trigger_debrief_summary: (params: {
        session_id: string;
        tickets_processed: number;
      }) => {
        console.log("DEBRIEF REQUEST", params);
        return JSON.stringify({ status: "synthesis_started", session_id: params.session_id });
      }
    },
    onConnect: () => console.log("ElevenLabs connected"),
    onDisconnect: () => console.log("ElevenLabs disconnected"),
    onError: (err) => console.error("ElevenLabs error", err),
  });

  const sendDueEvents = (currentTime: number) => {
    if (conversation.status !== "connected") return;

    for (const rawEvent of events.events) {
      const event = rawEvent as any;
      if (event.timestamp <= currentTime && !sent.current.has(event.event_id)) {
        const action = event.action?.type
          ? `${event.action.type.replaceAll("_", " ")}${event.action.value ? ` → ${event.action.value}` : ""}`
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

  const handleTimeUpdate = () => {
    sendDueEvents(videoRef.current?.currentTime ?? 0);
  };

  const start = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      await conversation.startSession({
        agentId: AGENT_ID,
      });

      const id = conversation.getId();
      setSessionId(id);

      console.log("Conversation ID:", id);
    } catch (error) {
      console.error("Failed to start ElevenLabs session", error);
      alert(
        "Could not start the ElevenLabs session. Check microphone permission and the agent configuration."
      );
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
      const event = rawEvent as any;
      if (event.timestamp < seconds) sent.current.add(event.event_id);
      else sent.current.delete(event.event_id);
    }
    setLastEvent(`Seeked to ${formatTime(seconds)}. Future events will continue from here.`);
  };

  return (
    <main style={{ fontFamily: "Arial, sans-serif", maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1>AI Apprentice — ElevenLabs Capture MVP</h1>
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

          <button
            onClick={conversation.status === "connected" ? conversation.endSession : start}
            style={{ padding: "10px 14px", cursor: "pointer" }}
          >
            {conversation.status === "connected" ? "End Apprentice Session" : "Start Apprentice"}
          </button>

          <h3>Last [SCREEN] update</h3>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#f6f6f6", padding: 10, borderRadius: 8 }}>
            {lastEvent}
          </pre>

          <h3>Logged decisions</h3>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, maxHeight: 220, overflow: "auto" }}>
            {JSON.stringify(loggedDecisions, null, 2)}
          </pre>
        </aside>
      </div>

      <Timeline onSeek={seekAndSync} />
    </main>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default Apprentice;
