/**
 * P1-12, P1-13 — Work Map Viewer & Evidence Replay
 * Dynamic viewer rendering the canonical WorkMap object (steps, guardrails, exceptions, teaching points).
 * Supports clickable evidence replay modal for screenshotRef references.
 */

import { useState } from "react";
import { useSession } from "../store/sessionStore";
import type { WorkMapStep } from "../types/index";
import EvidenceReplayModal from "../components/EvidenceReplayModal";

function EvidenceIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

  return (
    <div
      style={{
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.08))",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "20px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ marginBottom: 4, fontSize: 20 }}>🗺️ Work Map</h1>
            {workMap.confirmedByExpert ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--success)",
                  background: "var(--success-dim)",
                  border: "1px solid rgba(16,185,129,0.3)",
                  padding: "3px 10px",
                  borderRadius: "var(--radius-pill)",
                }}
              >
                ✓ Expert Confirmed
              </span>
            ) : (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--warning)",
                  background: "var(--warning-dim)",
                  padding: "3px 10px",
                  borderRadius: "var(--radius-pill)",
                }}
              >
                Unconfirmed
              </span>
            )}
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 2 }}>
            Expert: <b>{workMap.expertName || "Expert Triage Practitioner"}</b> · {workMap.steps.length} learned decision steps
          </p>
        </div>
        <button
          id="start-training-from-map-btn"
          className="btn btn-primary"
          onClick={startTraining}
        >
          🎓 Start Training
        </button>
      </div>

      {/* Content Area */}
      <div
        className="scroll-y"
        style={{ flex: 1, padding: "24px 28px", display: "flex", gap: 24, flexWrap: "wrap", alignContent: "flex-start" }}
      >
        {/* Summary */}
        {workMap.summary && (
          <div className="card fade-in" style={{ width: "100%", padding: "16px 20px" }}>
            <h3 style={{ marginBottom: 8, fontSize: 14 }}>Summary</h3>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)", margin: 0 }}>
              {workMap.summary}
            </p>
          </div>
        )}

        {/* Global Guardrails */}
        {workMap.guardrails && workMap.guardrails.length > 0 && (
          <div className="card fade-in" style={{ flex: "1 1 300px", padding: "16px 20px" }}>
            <h3 style={{ marginBottom: 12, fontSize: 14, color: "var(--danger)" }}>🚨 Global Guardrails</h3>
            <ul className="flex-col gap-2" style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {workMap.guardrails.map((g, i) => (
                <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span
                    style={{
                      flexShrink: 0,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "var(--danger-dim)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--danger)",
                    }}
                  >
                    !
                  </span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-secondary)" }}>{g}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Global Exceptions */}
        {workMap.exceptions && workMap.exceptions.length > 0 && (
          <div className="card fade-in" style={{ flex: "1 1 300px", padding: "16px 20px" }}>
            <h3 style={{ marginBottom: 12, fontSize: 14, color: "var(--info)" }}>💡 Exceptions</h3>
            <ul className="flex-col gap-2" style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {workMap.exceptions.map((ex, i) => (
                <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "var(--info)", flexShrink: 0, lineHeight: 1 }}>→</span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-secondary)" }}>{ex}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Dynamic WorkMap Steps List */}
        <div style={{ width: "100%" }}>
          <h3 style={{ marginBottom: 16, fontSize: 15 }}>Steps · {workMap.steps.length} learned decisions</h3>
          <div className="flex-col gap-4" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {workMap.steps.map((step) => (
              <div
                key={step.id}
                id={`step-${step.id}`}
                className="card fade-in"
                style={{ overflow: "visible", border: "1px solid var(--border-subtle)" }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 0 }}>
                  {/* Step number badge */}
                  <div
                    style={{
                      width: 52,
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "center",
                      paddingTop: 18,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#fff",
                        flexShrink: 0,
                        boxShadow: "0 0 12px rgba(99,102,241,0.4)",
                      }}
                    >
                      {step.stepNumber}
                    </div>
                  </div>

                  {/* Step details */}
                  <div style={{ padding: "16px 20px 16px 4px" }}>
                    {/* Top row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        {step.ticketId && (
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "var(--brand-primary)",
                              background: "var(--brand-primary-dim)",
                              border: "1px solid var(--brand-primary-glow)",
                              padding: "2px 8px",
                              borderRadius: "var(--radius-sm)",
                            }}
                          >
                            {step.ticketId}
                          </span>
                        )}
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>
                          {step.observedAction}
                        </span>
                      </div>

                      {/* Evidence Replay Button (Task P1-13) */}
                      {step.screenshotRef && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setSelectedEvidenceStep(step)}
                          title={`View evidence: ${step.screenshotRef}`}
                          style={{ display: "flex", alignItems: "center", gap: 6 }}
                        >
                          <EvidenceIcon />
                          <span>Replay Evidence</span>
                        </button>
                      )}
                    </div>

                    {/* Decision chip */}
                    <div style={{ marginBottom: 14 }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "5px 12px",
                          borderRadius: "var(--radius-pill)",
                          background: "var(--bg-raised)",
                          border: "1px solid var(--border-default)",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        ⚡ {step.decision}
                      </span>
                    </div>

                    {/* Grid of details */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
                      <div>
                        <div className="field-label" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
                          Expert Reasoning
                        </div>
                        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-secondary)", margin: 0 }}>
                          {step.expertReason}
                        </p>
                        {step.expertQuote && (
                          <blockquote
                            style={{
                              marginTop: 8,
                              fontSize: 12,
                              fontStyle: "italic",
                              color: "var(--text-muted)",
                              borderLeft: "2px solid var(--brand-primary-glow)",
                              paddingLeft: 10,
                              margin: "8px 0 0 0",
                            }}
                          >
                            "{step.expertQuote}"
                          </blockquote>
                        )}
                      </div>

                      <div>
                        <div className="field-label" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
                          Guardrails
                        </div>
                        {step.guardrails && step.guardrails.length > 0 ? (
                          step.guardrails.map((g, i) => (
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
                          ))
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>—</span>
                        )}
                      </div>

                      <div>
                        <div className="field-label" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
                          Teaching Point
                        </div>
                        <div
                          style={{
                            fontSize: 12.5,
                            color: "var(--info)",
                            background: "var(--info-dim)",
                            borderRadius: "var(--radius-sm)",
                            padding: "6px 10px",
                          }}
                        >
                          💡 {step.teachingPoint}
                        </div>
                      </div>

                      {step.exceptions && step.exceptions.length > 0 && (
                        <div>
                          <div className="field-label" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
                            Exceptions
                          </div>
                          {step.exceptions.map((ex, i) => (
                            <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4, marginBottom: 4 }}>
                              • {ex}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ width: "100%", display: "flex", justifyContent: "center", paddingBottom: 24, paddingTop: 12 }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={startTraining}
            style={{ minWidth: 240 }}
          >
            🎓 Start New Hire Training
          </button>
        </div>
      </div>

      {/* Task P1-13: Evidence Replay Modal */}
      <EvidenceReplayModal
        step={selectedEvidenceStep}
        onClose={() => setSelectedEvidenceStep(null)}
      />
    </div>
  );
}
