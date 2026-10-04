/**
 * P1-04, P1-07, P1-09 — AI Apprentice Side Panel
 * Provider-neutral panel showing agent status, messages, and ScreenEvent activity stream.
 * Does NOT expose raw Claude or provider payloads.
 */

import type { AgentMessage, ScreenEvent } from "../types/index";
import ScreenEventTimeline from "./ScreenEventTimeline";

interface ApprenticePanelProps {
  agentStatus: string;
  messages: AgentMessage[];
  screenEvents: ScreenEvent[];
  /** Optional slot for external/embedded voice control */
  elevenLabsSlot?: React.ReactNode;
  onSelectEvent?: (event: ScreenEvent) => void;
}

function formatTs(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function MessageBubble({ msg }: { msg: AgentMessage }) {
  const isAgent = msg.role === "agent";
  const kindIcon: Record<string, string> = {
    question: "❓",
    answer: "💬",
    status: "ℹ️",
    intervention: "🚨",
    teach_back: "📖",
  };

  return (
    <div
      className="fade-in"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isAgent ? "flex-start" : "flex-end",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          maxWidth: "92%",
          padding: "9px 13px",
          borderRadius: isAgent ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
          background: isAgent
            ? msg.kind === "intervention"
              ? "rgba(239,68,68,0.12)"
              : msg.kind === "question"
              ? "var(--brand-primary-dim)"
              : msg.kind === "teach_back"
              ? "rgba(99, 102, 241, 0.12)"
              : "var(--bg-raised)"
            : "var(--brand-primary)",
          border: `1px solid ${
            isAgent
              ? msg.kind === "intervention"
                ? "rgba(239,68,68,0.3)"
                : msg.kind === "question"
                ? "var(--brand-primary-glow)"
                : msg.kind === "teach_back"
                ? "rgba(99, 102, 241, 0.3)"
                : "var(--border-subtle)"
              : "transparent"
          }`,
          fontSize: 12.5,
          lineHeight: 1.55,
          color: isAgent && msg.kind !== "intervention" ? "var(--text-primary)" : undefined,
        }}
      >
        {isAgent && (
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color:
                msg.kind === "intervention"
                  ? "#f87171"
                  : msg.kind === "question"
                  ? "var(--brand-primary)"
                  : "var(--text-muted)",
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>{kindIcon[msg.kind] ?? "💬"}</span>
            <span>
              {msg.kind === "intervention"
                ? "Tutor Intervention"
                : msg.kind === "question"
                ? "Apprentice Question"
                : msg.kind === "teach_back"
                ? "Teach-Back"
                : "AI Apprentice"}
            </span>
          </div>
        )}
        <div>{msg.text}</div>
      </div>
      <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, marginLeft: 2, marginRight: 2 }}>
        {formatTs(msg.timestampMs)}
      </span>
    </div>
  );
}

export default function ApprenticePanel({
  agentStatus,
  messages,
  screenEvents,
  elevenLabsSlot,
  onSelectEvent,
}: ApprenticePanelProps) {
  const isConnected = agentStatus === "connected" || agentStatus === "speaking" || agentStatus === "listening";

  return (
    <div className="flex-col" style={{ height: "100%", display: "flex", overflow: "hidden" }}>
      {/* Header */}
      <div
        className="card-header"
        style={{
          padding: "14px 16px",
          flexShrink: 0,
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-2" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 16,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: 700,
            }}
          >
            ✦
          </span>
          <span style={{ fontWeight: 700, fontSize: 13 }}>AI Apprentice</span>
        </div>
        <div className="flex items-center gap-2" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className={`status-dot ${isConnected ? "connected" : "idle"}`} />
          <span style={{ fontSize: 11, fontWeight: 600, color: isConnected ? "var(--brand-primary)" : "var(--text-muted)" }}>
            {agentStatus.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Embedded ElevenLabs slot if provided */}
      {elevenLabsSlot && (
        <div style={{ flexShrink: 0, borderBottom: "1px solid var(--border-subtle)" }}>
          {elevenLabsSlot}
        </div>
      )}

      {/* Messages area */}
      <div
        className="scroll-y"
        style={{ flex: 1, padding: "12px 14px" }}
        ref={(el) => {
          if (el) el.scrollTop = el.scrollHeight;
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "36px 16px",
              color: "var(--text-muted)",
              fontSize: 12,
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 12 }}>🎧</div>
            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
              Listening Quietly
            </div>
            <div>Observing triage actions and capturing expert reasoning…</div>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
        )}
      </div>

      {/* Task P1-09: ScreenEvent Timeline & Activity stream */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--border-subtle)",
          padding: "10px 14px",
          maxHeight: 190,
          overflowY: "auto",
          background: "var(--bg-surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-muted)", margin: 0 }}>
            Workflow Activity
          </h3>
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>
            {screenEvents.length} events
          </span>
        </div>
        <ScreenEventTimeline events={screenEvents} maxItems={8} onSelectEvent={onSelectEvent} />
      </div>
    </div>
  );
}
