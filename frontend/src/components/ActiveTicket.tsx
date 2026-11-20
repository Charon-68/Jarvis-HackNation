/**
 * P1-02, P1-04 — Active Ticket Workspace (center panel)
 * Shows ticket details, priority/team/action selectors, and Save button.
 */
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Image as ImageIcon, OctagonAlert, TriangleAlert, Users, Wrench } from "lucide-react";
import type { Ticket, TicketPriority, TicketTeam, TicketAction, DecisionEvaluationResult } from "../types/index";
import PriorityBadge from "./ui/PriorityBadge";
import SelectField from "./ui/SelectField";

interface ActiveTicketProps {
  ticket: Ticket | null;
  onSave: (decision: { priority: TicketPriority; team: TicketTeam; action: TicketAction }) => Promise<void>;
  evaluationResult: DecisionEvaluationResult | null;
  onClearEvaluation: () => void;
  disabled?: boolean;
  mode?: "expert" | "training";
  isSaving?: boolean;
  onFieldChange?: (field: "priority" | "team" | "action", value: string) => void;
}

const PRIORITIES: TicketPriority[] = ["Emergency", "Moderate", "Low Priority"];
const TEAMS: TicketTeam[] = ["Operations", "HR", "Engineering", "Customer Support", "Accounting"];
const ACTIONS: TicketAction[] = [
  "Escalate Immediately",
  "Investigate & Resolve",
  "Follow Standard Procedure",
  "Request More Information",
  "Monitor & Follow Up",
];

const EASE = [0.16, 1, 0.3, 1] as const;

export default function ActiveTicket({
  ticket,
  onSave,
  evaluationResult,
  onClearEvaluation,
  disabled,
  mode = "expert",
  isSaving,
  onFieldChange,
}: ActiveTicketProps) {
  const priority = ticket?.priority ?? "Low Priority";
  const team = ticket?.team ?? "Customer Support";
  const action = ticket?.action ?? "Follow Standard Procedure";

  const canSave = !!ticket && !disabled && !isSaving;
  const intervention = evaluationResult?.intervention;
  const saved = !!evaluationResult?.allowSave;

  const handleSave = async () => {
    if (!canSave || !ticket) return;
    await onSave({ priority: ticket.priority, team: ticket.team, action: ticket.action });
  };

  const change = (field: "priority" | "team" | "action") => (val: string) => {
    onClearEvaluation();
    if (onFieldChange) onFieldChange(field, val);
  };

  if (!ticket) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="grid size-14 place-items-center rounded-2xl border border-line bg-raised/60">
          <Wrench className="size-6 text-fg-faint" aria-hidden />
        </div>
        <p className="text-sm font-medium text-fg">Select a ticket to begin</p>
        <p className="max-w-[32ch] text-xs text-fg-muted">
          {disabled ? "Start recording, then pick a ticket from the queue." : "Pick a ticket from the queue to triage it."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Ticket header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 rounded-md bg-signal/10 px-2 py-1 font-mono text-[13px] font-medium text-signal ring-1 ring-signal/25">
            {ticket.id}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-fg">{ticket.customer}</div>
            <div className="hud-tag text-fg-faint">{mode === "expert" ? "Expert workspace" : "Training workspace"}</div>
          </div>
        </div>
        <PriorityBadge priority={priority} size="md" />
      </div>

      {/* Ticket body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto max-w-2xl">
          {/* Issue + scope */}
          <p className="hud-tag mb-2 text-fg-faint">Issue</p>
          <p className="text-[17px] font-medium leading-snug text-fg">{ticket.issue}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="hud-tag text-fg-faint">Scope</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1 text-xs text-fg-muted">
              <Users className="size-3.5" aria-hidden />
              {ticket.scope}
            </span>
          </div>

          <div className="my-6 h-px bg-line" />

          {/* Decision */}
          <p className="hud-tag mb-4 text-fg-faint">Triage decision</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField id="priority-select" label="Priority" value={priority} options={PRIORITIES} disabled={disabled} onChange={change("priority")} />
            <SelectField id="team-select" label="Team" value={team} options={TEAMS} disabled={disabled} onChange={change("team")} />
            <div className="sm:col-span-2">
              <SelectField id="action-select" label="Action" value={action} options={ACTIONS} disabled={disabled} onChange={change("action")} />
            </div>
          </div>

          <button
            id="save-decision-btn"
            onClick={handleSave}
            disabled={!canSave}
            className={`focus-ring mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-medium transition disabled:cursor-not-allowed ${
              saved
                ? "bg-verified/15 text-verified ring-1 ring-verified/40"
                : "bg-signal text-signal-ink shadow-[0_0_28px_rgba(200,246,90,0.18)] hover:bg-[#d6ff78] disabled:opacity-40 disabled:shadow-none"
            }`}
          >
            {isSaving ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" /> Evaluating…
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="size-4" aria-hidden /> Decision saved
              </>
            ) : (
              <>Save decision</>
            )}
          </button>

          <AnimatePresence>
            {/* Intervention */}
            {intervention && (
              <motion.div
                key="intervention"
                role="alert"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: EASE }}
                className={`mt-5 overflow-hidden rounded-xl border ${
                  intervention.severity === "critical" ? "border-stop/40 bg-stop/[0.08]" : "border-amber/35 bg-amber/[0.07]"
                }`}
              >
                <div className="flex items-center gap-2.5 px-4 pt-4">
                  {intervention.severity === "critical" ? (
                    <OctagonAlert className="size-5 text-stop" aria-hidden />
                  ) : (
                    <TriangleAlert className="size-5 text-amber" aria-hidden />
                  )}
                  <span className={`text-sm font-semibold ${intervention.severity === "critical" ? "text-stop" : "text-amber"}`}>
                    {intervention.severity === "critical" ? "Check this decision" : "Decision needs review"}
                  </span>
                </div>
                <p className="px-4 pt-2 text-[13.5px] leading-relaxed text-fg">{intervention.message}</p>

                {intervention.guardrail && (
                  <figure className="mx-4 mt-4 border-l-2 border-stop/60 pl-4">
                    <figcaption className="hud-tag mb-1 text-fg-faint">Expert rule</figcaption>
                    <blockquote className="font-display text-[19px] leading-snug text-fg">{intervention.guardrail}</blockquote>
                  </figure>
                )}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-line bg-ink/30 px-4 py-3">
                  <button
                    onClick={onClearEvaluation}
                    className="focus-ring rounded-lg border border-line-strong bg-raised px-3 py-1.5 text-xs font-medium text-fg transition hover:border-fg-faint"
                  >
                    Fix decision
                  </button>
                  {intervention.expertEvidence && (
                    <button className="focus-ring flex items-center gap-1.5 rounded-lg border border-line bg-raised px-3 py-1.5 text-xs text-fg-muted transition hover:text-fg">
                      <ImageIcon className="size-3.5" aria-hidden /> View expert evidence
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Success */}
            {saved && (
              <motion.div
                key="saved"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="mt-4 flex items-center gap-2.5 rounded-xl border border-verified/30 bg-verified/[0.08] px-4 py-3"
              >
                <CheckCircle2 className="size-4 text-verified" aria-hidden />
                <span className="text-[13px] font-medium text-verified">Correct decision: matches expert knowledge</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
