/**
 * P1-12, P1-13 — Work Map Viewer & Evidence Replay
 * Horizontal Timeline viewer rendering the canonical WorkMap object.
 * Supports clickable evidence replay modal for screenshotRef references.
 */

import { useState } from "react";
import { useSession } from "../store/sessionStore";
import type { WorkMapStep } from "../types/index";
import EvidenceReplayModal from "../components/EvidenceReplayModal";

function EvidenceIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

export default function WorkMapScreen() {
  const { state, startTraining } = useSession();
  const [selectedEvidenceStep, setSelectedEvidenceStep] = useState<WorkMapStep | null>(null);

  const workMap = state.workMap;
  const [expandedStepId, setExpandedStepId] = useState<string | null>(
    workMap?.steps?.[0]?.id || null,
  );

  if (!workMap) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
          color: "var(--text-muted)",
        }}
      >
        <span className="spinner" style={{ width: 32, height: 32 }} />
        <span style={{ fontSize: 14 }}>Synthesizing Work Map…</span>
      </div>
    );
  }

  const activeStep = workMap.steps.find((s) => s.id === expandedStepId) || null;

  return (
    <div
      style={{
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-app)",
      }}
    >
      {/* Header (Part 7: Minimal, clean header) */}
      <div
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          padding: "16px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-surface)",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Work Map</h1>
            {workMap.confirmedByExpert ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--success)",
                  background: "var(--success-dim)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                Expert Confirmed
              </span>
            ) : (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--warning)",
                  background: "var(--warning-dim)",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                Unconfirmed
              </span>
            )}
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 12.5, marginTop: 4, margin: 0 }}>
            Expert: {workMap.expertName || "Triage Practitioner"} · {workMap.steps.length} learned steps
          </p>
        </div>
        <button
          id="start-training-from-map-btn"
          className="btn btn-primary"
          onClick={startTraining}
        >
          Start Training
        </button>
      </div>

      {/* Main Content Area */}
      <div
        className="scroll-y"
        style={{
          flex: 1,
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Summary & Global Rules (Part 8: Compact summary section) */}
        {(workMap.summary || (workMap.guardrails && workMap.guardrails.length > 0)) && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: workMap.summary && workMap.guardrails?.length ? "1fr 1fr" : "1fr",
              gap: 16,
              flexShrink: 0,
            }}
          >
            {workMap.summary && (
              <div
                className="card"
                style={{
                  padding: "14px 18px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-surface)",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
                  Workflow Overview
                </div>
                <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-secondary)", margin: 0 }}>
                  {workMap.summary}
                </p>
              </div>
            )}

            {workMap.guardrails && workMap.guardrails.length > 0 && (
              <div
                className="card"
                style={{
                  padding: "14px 18px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-surface)",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--danger)", marginBottom: 6 }}>
                  Global Guardrails
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {workMap.guardrails.map((g, i) => (
                    <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 6, alignItems: "flex-start" }}>
                      <span style={{ color: "var(--danger)", fontWeight: 700 }}>!</span>
                      <span>{g}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section Heading */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>
            Chronological Decision Sequence
          </h2>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Select a step to view rationale
          </span>
        </div>

        {/* PART 1 & 2 — HORIZONTAL TIMELINE */}
        <div
          style={{
            overflowX: "auto",
            paddingBottom: 12,
            paddingTop: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 16,
              minWidth: "max-content",
            }}
          >
            {workMap.steps.map((step, idx) => {
              const isSelected = step.id === expandedStepId;
              const hasNext = idx < workMap.steps.length - 1;

              return (
                <div
                  key={step.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  {/* Timeline Column (Show Instance button + Step Block) */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      width: 220,
                    }}
                  >
                    {/* PART 2 — Show instance button ABOVE the corresponding block */}
                    {step.screenshotRef ? (
                      <button
                        className="btn btn-xs btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvidenceStep(step);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 11,
                          padding: "3px 10px",
                          borderRadius: "var(--radius-pill)",
                          marginBottom: 8,
                          border: "1px solid var(--border-subtle)",
                          background: "var(--bg-raised)",
                          color: "var(--brand-primary)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        title="Show captured screen frame"
                      >
                        <EvidenceIcon />
                        <span>Show instance</span>
                      </button>
                    ) : (
                      <div style={{ height: 26, marginBottom: 8 }} />
                    )}

                    {/* Step Block */}
                    <div
                      id={`step-${step.id}`}
                      onClick={() => setExpandedStepId(isSelected ? null : step.id)}
                      style={{
                        width: "100%",
                        padding: 14,
                        borderRadius: "var(--radius-md)",
                        background: isSelected ? "var(--bg-raised)" : "var(--bg-surface)",
                        border: isSelected
                          ? "1.5px solid var(--brand-primary)"
                          : "1px solid var(--border-subtle)",
                        boxShadow: isSelected
                          ? "0 4px 16px rgba(99,102,241,0.15)"
                          : "0 2px 4px rgba(0,0,0,0.2)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        userSelect: "none",
                      }}
                    >
                      {/* Top Row: Step Number & Ticket ID */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            fontWeight: 700,
                            color: isSelected ? "var(--brand-primary)" : "var(--text-muted)",
                          }}
                        >
                          STEP {String(step.stepNumber).padStart(2, "0")}
                        </span>

                        {step.ticketId && (
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "var(--brand-primary)",
                              background: "var(--brand-primary-dim)",
                              padding: "1px 6px",
                              borderRadius: "var(--radius-sm)",
                            }}
                          >
                            {step.ticketId}
                          </span>
                        )}
                      </div>

                      {/* Action summary title */}
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          marginBottom: 8,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={step.observedAction}
                      >
                        {step.observedAction}
                      </div>

                      {/* Decision chip */}
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: "var(--text-secondary)",
                          background: "var(--bg-app)",
                          border: "1px solid var(--border-subtle)",
                          padding: "3px 8px",
                          borderRadius: "var(--radius-sm)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={step.decision}
                      >
                        {step.decision}
                      </div>
                    </div>
                  </div>

                  {/* Visual connector line between steps */}
                  {hasNext && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        color: "var(--border-default)",
                        fontSize: 16,
                        marginBottom: 36,
                        userSelect: "none",
                      }}
                    >
                      →
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* PART 1 — EXPANDED STEP DETAIL PANEL */}
        {activeStep && (
          <div
            className="card fade-in"
            style={{
              padding: 20,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Expanded Header Row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--border-subtle)",
                paddingBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--brand-primary)",
                    background: "var(--brand-primary-dim)",
                    padding: "3px 8px",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  Step {activeStep.stepNumber} {activeStep.ticketId ? `· ${activeStep.ticketId}` : ""}
                </span>
                <h3 style={{ fontSize: 14, margin: 0, color: "var(--text-primary)" }}>
                  {activeStep.observedAction}
                </h3>
              </div>

              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--brand-primary)",
                  background: "var(--brand-primary-dim)",
                  border: "1px solid var(--brand-primary-glow)",
                  padding: "4px 12px",
                  borderRadius: "var(--radius-pill)",
                }}
              >
                {activeStep.decision}
              </div>
            </div>

            {/* Grid of step details */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
              {/* Expert Reasoning & Quote */}
              <div>
                <div className="field-label" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
                  Expert Rationale
                </div>
                <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-secondary)", margin: 0 }}>
                  {activeStep.expertReason}
                </p>
                {activeStep.expertQuote && (
                  <blockquote
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      fontStyle: "italic",
                      color: "var(--text-muted)",
                      borderLeft: "2px solid var(--brand-primary)",
                      paddingLeft: 10,
                      margin: "10px 0 0 0",
                    }}
                  >
                    "{activeStep.expertQuote}"
                  </blockquote>
                )}
              </div>

              {/* Teaching Point */}
              <div>
                <div className="field-label" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
                  Teaching Point
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--info)",
                    background: "var(--info-dim)",
                    border: "1px solid rgba(59,130,246,0.2)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 12px",
                    lineHeight: 1.5,
                  }}
                >
                  {activeStep.teachingPoint}
                </div>
              </div>

              {/* Guardrails */}
              {activeStep.guardrails && activeStep.guardrails.length > 0 && (
                <div>
                  <div className="field-label" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--danger)", marginBottom: 6 }}>
                    Guardrails
                  </div>
                  {activeStep.guardrails.map((g, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 12,
                        color: "var(--danger)",
                        background: "var(--danger-dim)",
                        borderRadius: "var(--radius-sm)",
                        padding: "4px 8px",
                        marginBottom: 4,
                        borderLeft: "2px solid var(--danger)",
                      }}
                    >
                      {g}
                    </div>
                  ))}
                </div>
              )}

              {/* Exceptions */}
              {activeStep.exceptions && activeStep.exceptions.length > 0 && (
                <div>
                  <div className="field-label" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
                    Exceptions
                  </div>
                  {activeStep.exceptions.map((ex, i) => (
                    <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4, marginBottom: 4 }}>
                      • {ex}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Start Training CTA */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8, paddingBottom: 16 }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={startTraining}
            style={{ minWidth: 220 }}
          >
            Start New Hire Training
          </button>
        </div>
      </div>

      {/* Evidence Replay Modal (Part 3 & 6) */}
      <EvidenceReplayModal
        step={selectedEvidenceStep}
        onClose={() => setSelectedEvidenceStep(null)}
      />
    </div>
  );
}

