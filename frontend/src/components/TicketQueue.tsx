/**
 * P1-02, P1-04 — Ticket Queue (left panel)
 * Shows the list of tickets; highlights the active one.
 */
import type { Ticket } from "../types/index";

interface TicketQueueProps {
  tickets: Ticket[];
  activeTicketId: string | null;
  solvedTicketIds: string[];
  onSelect: (id: string) => void;
  disabled?: boolean;
}

function priorityClass(p: string) {
  if (p === "Emergency") return "badge-emergency";
  if (p === "Moderate") return "badge-moderate";
  return "badge-low";
}

export default function TicketQueue({
  tickets,
  activeTicketId,
  solvedTicketIds,
  onSelect,
  disabled,
}: TicketQueueProps) {
  return (
    <div className="flex-col gap-1" style={{ height: "100%", display: "flex" }}>
      <div className="card-header" style={{ padding: "14px 16px" }}>
        <h3 style={{ margin: 0 }}>Open Tickets</h3>
        <span
          className="badge badge-neutral"
          style={{ fontSize: 11 }}
        >
          {tickets.length}
        </span>
      </div>

      <div
        className="scroll-y"
        style={{ flex: 1, padding: "8px 8px" }}
      >
        {tickets.map((t) => {
          const isActive = t.id === activeTicketId;
          const isSolved = solvedTicketIds.includes(t.id);

          return (
            <button
              key={t.id}
              onClick={() => !disabled && onSelect(t.id)}
              disabled={disabled}
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${isActive ? "var(--brand-primary)" : "transparent"}`,
                background: isActive
                  ? "var(--brand-primary-dim)"
                  : isSolved
                  ? "rgba(16,185,129,0.05)"
                  : "transparent",
                cursor: disabled ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "all var(--transition-default)",
                marginBottom: 2,
                opacity: disabled ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isActive && !disabled)
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = isActive
                  ? "var(--brand-primary-dim)"
                  : isSolved
                  ? "rgba(16,185,129,0.05)"
                  : "transparent";
              }}
            >
              <div className="flex items-center gap-2" style={{ justifyContent: "space-between" }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: isActive ? "var(--brand-primary)" : "var(--text-secondary)",
                  }}
                >
                  {t.id}
                </span>
                <span className={`badge ${priorityClass(t.priority)}`}>{t.priority}</span>
              </div>

              <span
                style={{
                  fontSize: 12,
                  color: isSolved ? "var(--text-muted)" : "var(--text-primary)",
                  fontWeight: 500,
                  lineHeight: 1.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                }}
              >
                {t.customer}
              </span>

              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                }}
              >
                {t.issue}
              </span>

              {isSolved && (
                <span style={{ fontSize: 10, color: "var(--success)", fontWeight: 600 }}>
                  ✓ Saved
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
