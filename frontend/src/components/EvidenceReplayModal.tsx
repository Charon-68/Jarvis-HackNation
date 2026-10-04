/**
 * P1-13 — Expert Evidence Viewer Modal
 * Displays actual captured screen frames for a selected WorkMapStep.
 */

import { useEffect } from "react";
import type { WorkMapStep } from "../types/index";
import { evidenceStore } from "../store/evidenceStore";

interface EvidenceReplayModalProps {
  step: WorkMapStep | null;
  onClose: () => void;
}

export default function EvidenceReplayModal({ step, onClose }: EvidenceReplayModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!step) return null;

  const evidenceUrl = evidenceStore.getEvidenceUrl(step.screenshotRef, step.ticketId);

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
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        className="card fade-in"
        style={{
          width: "100%",
          maxWidth: 820,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
          padding: 0,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-raised)",
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
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              Step {step.stepNumber} · {step.ticketId || "Instance"}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              {step.observedAction}
            </span>
          </div>

          <button
            className="btn btn-sm btn-secondary"
            onClick={onClose}
            aria-label="Close modal"
            style={{ borderRadius: "var(--radius-sm)", width: 28, height: 28, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 20, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Actual Captured Image */}
          <div
            style={{
              width: "100%",
              minHeight: 280,
              maxHeight: "55vh",
              borderRadius: "var(--radius-sm)",
              background: "#0d0e15",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {evidenceUrl ? (
              <img
                src={evidenceUrl}
                alt={`Captured screen evidence for ${step.ticketId || step.stepNumber}`}
                style={{
                  maxWidth: "100%",
                  maxHeight: "55vh",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            ) : (
              <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: 40 }}>
                Evidence unavailable
              </div>
            )}
          </div>

          {/* Decision and Reason Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "var(--bg-raised)", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
                Decision
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                {step.decision}
              </div>
            </div>

            <div style={{ background: "var(--bg-raised)", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
                Expert Rationale
              </div>
              <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-secondary)", margin: 0 }}>
                {step.expertReason}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
