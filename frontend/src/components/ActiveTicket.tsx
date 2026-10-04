/**
 * P1-02, P1-04 — Active Ticket Workspace (center panel)
 * Shows ticket details, priority/team/action selectors, and Save button.
 */
import { useState } from "react";
import type {
  Ticket,
  TicketPriority,
  TicketTeam,
  TicketAction,
  DecisionEvaluationResult,
} from "../types/index";

interface ActiveTicketProps {
  ticket: Ticket | null;
  onSave: (decision: { priority: TicketPriority; team: TicketTeam; action: TicketAction }) => Promise<void>;
  evaluationResult: DecisionEvaluationResult | null;
  onClearEvaluation: () => void;
  disabled?: boolean;
  mode?: "expert" | "training";
  isSaving?: boolean;
}

const PRIORITIES: TicketPriority[] = ["P1", "P2", "P3"];
const TEAMS: TicketTeam[] = ["Infrastructure", "Support", "Engineering"];
const ACTIONS: TicketAction[] = [
  "Immediate escalation",
  "Normal troubleshooting",
  "STOP normal processing + escalate",
  "Send reset procedure",
  "Investigate performance",
];

function priorityColor(p: string) {
  if (p === "P1") return "var(--p1-text)";
  if (p === "P2") return "var(--p2-text)";
  return "var(--p3-text)";
}

function priorityBg(p: string) {
  if (p === "P1") return "var(--p1-bg)";
  if (p === "P2") return "var(--p2-bg)";
  return "var(--p3-bg)";
}

export default function ActiveTicket({
  ticket,
  onSave,
  evaluationResult,
  onClearEvaluation,
  disabled,
  mode = "expert",
  isSaving,
}: ActiveTicketProps) {
  const [priority, setPriority] = useState<TicketPriority>("P3");
  const [team, setTeam] = useState<TicketTeam>("Support");
  const [action, setAction] = useState<TicketAction>("Normal troubleshooting");

  // Reset selectors when ticket changes
  const prevTicket = useState<string | null>(null);
  const [lastTicketId, setLastTicketId] = prevTicket;
  if (ticket && ticket.id !== lastTicketId) {
    setPriority("P3");
    setTeam("Support");
    setAction("Normal troubleshooting");
    setLastTicketId(ticket.id);
  }

  const canSave = !!ticket && !disabled && !isSaving;
  const intervention = evaluationResult?.intervention;

  const handleSave = async () => {
    if (!canSave) return;
    await onSave({ priority, team, action });
  };

  if (!ticket) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          color: "var(--text-muted)",
        }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
        <span style={{ fontSize: 14 }}>Select a ticket to begin</span>
      </div>
    );
  }

  return (
    <div className="flex-col" style={{ height: "100%", overflow: "hidden", display: "flex" }}>
      {/* Ticket header */}
      <div className="card-header">
        <div className="flex items-center gap-3">
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--brand-primary)",
              background: "var(--brand-primary-dim)",
              padding: "4px 10px",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {ticket.id}
          </span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{ticket.customer}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {mode === "expert" ? "Expert Workspace" : "Training Workspace"}
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: "var(--radius-pill)",
            background: priorityBg(priority),
            color: priorityColor(priority),
          }}
        >
          {priority}
        </span>
      </div>

      {/* Ticket body */}
      <div className="scroll-y" style={{ flex: 1, padding: "16px 20px" }}>
        {/* Issue + Scope */}
        <div className="flex-col gap-3" style={{ marginBottom: 20 }}>
          <div>
            <div className="field-label">Issue</div>
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.5 }}>
              {ticket.issue}
            </p>
          </div>
          <div>
            <div className="field-label">Scope</div>
            <span className="chip">{ticket.scope}</span>
          </div>
        </div>

        <div className="divider" />

        {/* Decision fields */}
        <div className="flex-col gap-4" style={{ marginBottom: 20 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="priority-select">Priority</label>
            <select
              id="priority-select"
              className="select-field"
              value={priority}
              onChange={(e) => { setPriority(e.target.value as TicketPriority); onClearEvaluation(); }}
              disabled={disabled}
            >
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="team-select">Team</label>
            <select
              id="team-select"
              className="select-field"
              value={team}
              onChange={(e) => { setTeam(e.target.value as TicketTeam); onClearEvaluation(); }}
              disabled={disabled}
            >
              {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="action-select">Action</label>
            <select
              id="action-select"
              className="select-field"
              value={action}
              onChange={(e) => { setAction(e.target.value as TicketAction); onClearEvaluation(); }}
              disabled={disabled}
            >
              {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* Save button */}
        <button
          id="save-decision-btn"
          className={`btn btn-lg ${evaluationResult?.allowSave ? "btn-success" : "btn-primary"}`}
          style={{ width: "100%" }}
          onClick={handleSave}
          disabled={!canSave}
        >
          {isSaving ? (
            <><span className="spinner" /> Evaluating…</>
          ) : evaluationResult?.allowSave ? (
            <>✓ Decision Saved</>
          ) : (
            <>Save Decision</>
          )}
        </button>

        {/* Intervention banner */}
        {intervention && (
          <div
            className={`intervention-banner ${intervention.severity === "critical" ? "intervention-critical" : "intervention-warning"}`}
            style={{ marginTop: 16 }}
          >
            <div
              className="flex items-center gap-2"
              style={{ marginBottom: 10 }}
            >
              <span style={{ fontSize: 18 }}>
                {intervention.severity === "critical" ? "🚨" : "⚠️"}
              </span>
              <span style={{ fontWeight: 700, color: intervention.severity === "critical" ? "var(--danger)" : "var(--warning)" }}>
                {intervention.severity === "critical" ? "CRITICAL — Check This Decision" : "Decision Needs Review"}
              </span>
            </div>

            <p style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
              {intervention.message}
            </p>

            {intervention.guardrail && (
              <div
                style={{
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 12px",
                  marginBottom: 12,
                  borderLeft: "3px solid var(--danger)",
                }}
              >
                <div className="field-label" style={{ marginBottom: 4 }}>Expert Rule</div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{intervention.guardrail}</p>
              </div>
            )}

            <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
              <button
                className="btn btn-sm btn-secondary"
                onClick={onClearEvaluation}
              >
                Fix Decision
              </button>
              {intervention.expertEvidence && (
                <button className="btn btn-sm btn-secondary">
                  📷 View Expert Evidence
                </button>
              )}
            </div>
          </div>
        )}

        {/* Success state */}
        {evaluationResult?.allowSave && (
          <div
            style={{
              background: "var(--success-dim)",
              border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: "var(--radius-md)",
              padding: "12px 16px",
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 18 }}>✅</span>
            <span style={{ fontSize: 13, color: "var(--success)", fontWeight: 600 }}>
              Correct decision — matches expert knowledge
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
