/**
 * P1-13 — Expert Evidence Viewer Modal
 * Displays actual captured screen frames for a selected WorkMapStep.
 */

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ImageOff, X } from "lucide-react";
import type { WorkMapStep } from "../types/index";
import { trapTab } from "../lib/a11y";
import { evidenceStore } from "../store/evidenceStore";

interface EvidenceReplayModalProps {
  step: WorkMapStep | null;
  onClose: () => void;
}

export default function EvidenceReplayModal({ step, onClose }: EvidenceReplayModalProps) {
  const closeBtn = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!step) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else trapTab(e, dialog.current);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, onClose]);

  // Move focus into the dialog, and back to the trigger when it closes.
  useEffect(() => {
    if (step) {
      opener.current = document.activeElement;
      requestAnimationFrame(() => closeBtn.current?.focus());
    } else if (opener.current instanceof HTMLElement) {
      opener.current.focus();
      opener.current = null;
    }
  }, [step]);

  const evidenceUrl = step ? evidenceStore.getEvidenceUrl(step.screenshotRef, step.ticketId) : null;

  return (
    <AnimatePresence>
      {step && (
        <motion.div
          key="evidence"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="evidence-title"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex max-h-[90vh] w-full max-w-[860px] flex-col overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="shrink-0 rounded-md bg-signal/10 px-2 py-0.5 font-mono text-[11px] text-signal ring-1 ring-signal/25">
                  Step {step.stepNumber} · {step.ticketId || "Instance"}
                </span>
                <h2 id="evidence-title" className="m-0 truncate text-[13.5px] font-medium normal-case tracking-normal text-fg">
                  {step.observedAction}
                </h2>
              </div>
              <button
                ref={closeBtn}
                onClick={onClose}
                aria-label="Close evidence"
                className="focus-ring grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-raised text-fg-muted transition hover:text-fg"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
              <figure className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-xl border border-line bg-ink">
                <span className="hud-tag absolute left-3 top-3 rounded bg-ink/80 px-1.5 py-0.5 text-fg-faint">Captured screen</span>
                {evidenceUrl ? (
                  <img
                    src={evidenceUrl}
                    alt={`Captured screen evidence for ${step.ticketId || step.stepNumber}`}
                    className="block max-h-[55vh] max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 p-10 text-center text-[13px] text-fg-faint">
                    <ImageOff className="size-6" aria-hidden />
                    Evidence unavailable
                  </div>
                )}
              </figure>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-raised/60 px-4 py-3">
                  <p className="hud-tag mb-1 text-fg-faint">Decision</p>
                  <p className="font-mono text-[12.5px] text-fg">{step.decision}</p>
                </div>
                <div className="rounded-xl border border-line bg-raised/60 px-4 py-3">
                  <p className="hud-tag mb-1 text-fg-faint">Expert rationale</p>
                  <p className="text-[12.5px] leading-relaxed text-fg-muted">{step.expertReason}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
