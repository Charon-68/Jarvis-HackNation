/**
 * P1-09 — ScreenEvent UI Consumer & Activity Timeline
 * Displays a concise semantic event stream (ticket opened, priority changed, etc.)
 * Filters out raw Claude output or internal JSON.
 */

import type { ScreenEvent } from "../types/index";

interface ScreenEventTimelineProps {
  events: ScreenEvent[];
  maxItems?: number;
  highlightedEventId?: string;
  onSelectEvent?: (event: ScreenEvent) => void;
}

function formatEventTime(timestampMs: number): string {
  const d = new Date(timestampMs);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getEventBadgeColor(type: string): { bg: string; border: string; text: string; icon: string } {
  switch (type) {
    case "ticket_opened":
      return { bg: "rgba(99, 102, 241, 0.12)", border: "rgba(99, 102, 241, 0.3)", text: "#818cf8", icon: "📂" };
    case "priority_changed":
      return { bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)", text: "#fbbf24", icon: "🎯" };
    case "team_changed":
      return { bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.3)", text: "#60a5fa", icon: "👥" };
    case "action_changed":
      return { bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.3)", text: "#f87171", icon: "⚡" };
    case "decision_saved":
      return { bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.3)", text: "#34d399", icon: "💾" };
    default:
      return { bg: "var(--bg-raised)", border: "var(--border-subtle)", text: "var(--text-secondary)", icon: "📡" };
  }
}

export default function ScreenEventTimeline({
  events,
  maxItems = 10,
  highlightedEventId,
  onSelectEvent,
}: ScreenEventTimelineProps) {
  const displayEvents = [...events].reverse().slice(0, maxItems);

  if (displayEvents.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: 11.5, padding: "8px 0", textAlign: "center" }}>
        No screen activity recorded yet.
      </div>
    );
  }

  return (
    <div className="flex-col gap-2" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {displayEvents.map((evt) => {
        const style = getEventBadgeColor(evt.type);
        const isHighlighted = highlightedEventId === evt.id;

        return (
          <div
            key={evt.id}
            className="fade-in"
            onClick={() => onSelectEvent?.(evt)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "7px 10px",
              borderRadius: "var(--radius-sm)",
              background: isHighlighted ? style.bg : "var(--bg-raised)",
              border: `1px solid ${isHighlighted ? style.border : "var(--border-subtle)"}`,
              fontSize: 11.5,
              cursor: onSelectEvent ? "pointer" : "default",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ flexShrink: 0, fontSize: 13, lineHeight: 1.2 }}>{style.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  {evt.ticketId ? `Ticket ${evt.ticketId}` : "Workflow"}
                </span>
                <span style={{ fontSize: 9.5, color: "var(--text-muted)" }}>
                  {formatEventTime(evt.timestampMs)}
                </span>
              </div>

              <div style={{ color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.4 }}>
                {evt.description}
              </div>

              {evt.newValue && (
                <div style={{ marginTop: 3 }}>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: style.text,
                      background: style.bg,
                      border: `1px solid ${style.border}`,
                      borderRadius: 4,
                      padding: "1px 5px",
                    }}
                  >
                    → {evt.newValue}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
