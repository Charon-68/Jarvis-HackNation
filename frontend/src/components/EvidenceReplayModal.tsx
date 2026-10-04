/**
 * P1-13 — Clickable Expert Evidence Replay Modal
 * Displays captured evidence (screenshot/frame, expert quote, and decision state)
 * for a selected WorkMapStep.
 */

import type { WorkMapStep } from "../types/index";

interface EvidenceReplayModalProps {
  step: WorkMapStep | null;
  onClose: () => void;
}

export default function EvidenceReplayModal({ step, onClose }: EvidenceReplayModalProps) {
  if (!step) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card fade-in"
        style={{
          width: "100%",
          maxWidth: 680,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--bg-surface)",
          border: "1px solid var(--brand-primary-glow)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-raised)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 12,
                color: "#fff",
              }}
            >
              {step.stepNumber}
            </span>
            <div>
              <h3 style={{ fontSize: 14, margin: 0 }}>
                Expert Evidence · {step.ticketId ? `Ticket ${step.ticketId}` : "Step Observation"}
              </h3>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Ref: {step.screenshotRef || "captured_frame_01.png"}
              </span>
            </div>
          </div>
          <button
            className="btn btn-sm btn-secondary"
            onClick={onClose}
            style={{ borderRadius: "50%", width: 30, height: 30, padding: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Mock Screen Frame Display */}
          <div
            style={{
              width: "100%",
              height: 260,
              borderRadius: "var(--radius-md)",
              background: "#12131c",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Mock Screen UI Top Bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 28,
                background: "#1e202e",
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                gap: 6,
                borderBottom: "1px solid #2a2d40",
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f56" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffbd2e" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#27c93f" }} />
              <span style={{ fontSize: 10, color: "#8b949e", marginLeft: 8, fontFamily: "monospace" }}>
                Support Triage Workspace — {step.ticketId} Screenshot Evidence
              </span>
            </div>

            {/* Simulated Captured Evidence Content */}
            <div
              style={{
                marginTop: 28,
                padding: 20,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 36 }}>📸</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                {step.observedAction}
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
                Decision: {step.decision}
              </div>
            </div>
          </div>

          {/* Reasoning & Quote Details */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "var(--bg-raised)", padding: 14, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
              <div className="field-label" style={{ marginBottom: 4 }}>Expert Rationale</div>
              <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-secondary)", margin: 0 }}>
                {step.expertReason}
              </p>
            </div>

            {step.expertQuote && (
              <div style={{ background: "var(--bg-raised)", padding: 14, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                <div className="field-label" style={{ marginBottom: 4 }}>Expert Audio Quote</div>
                <blockquote style={{ fontSize: 12, fontStyle: "italic", color: "var(--brand-primary)", margin: 0 }}>
                  "{step.expertQuote}"
                </blockquote>
              </div>
            )}
          </div>

          {/* Teaching Point & Guardrails */}
          {step.teachingPoint && (
            <div
              style={{
                fontSize: 12.5,
                background: "var(--info-dim)",
                border: "1px solid rgba(59,130,246,0.3)",
                color: "var(--info)",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              💡 <b>Teaching Point:</b> {step.teachingPoint}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
