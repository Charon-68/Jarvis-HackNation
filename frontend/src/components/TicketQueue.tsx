/**
 * P1-02, P1-04 — Ticket Queue (left panel)
 * Shows the list of tickets; highlights the active one.
 */
import { CheckCircle2 } from "lucide-react";
import type { Ticket } from "../types/index";
import PriorityBadge from "./ui/PriorityBadge";

interface TicketQueueProps {
  tickets: Ticket[];
  activeTicketId: string | null;
  solvedTicketIds: string[];
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export default function TicketQueue({ tickets, activeTicketId, solvedTicketIds, onSelect, disabled }: TicketQueueProps) {
  const solved = tickets.filter((t) => solvedTicketIds.includes(t.id)).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3.5">
        <h3 className="hud-tag m-0 text-fg-faint">Open tickets</h3>
        <span className="font-mono text-[11px] text-fg-muted">
          {solved > 0 && <span className="text-verified">{solved}/</span>}
          {tickets.length}
        </span>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto p-2" aria-label="Tickets">
        {tickets.map((t) => {
          const isActive = t.id === activeTicketId;
          const isSolved = solvedTicketIds.includes(t.id);

          return (
            <li key={t.id} className="mb-0.5">
              <button
                onClick={() => !disabled && onSelect(t.id)}
                disabled={disabled}
                aria-current={isActive ? "true" : undefined}
                className={`focus-ring group relative flex w-full flex-col gap-1 overflow-hidden rounded-lg px-3 py-2.5 text-left transition ${
                  isActive
                    ? "bg-raised ring-1 ring-line-strong"
                    : "hover:bg-raised disabled:hover:bg-transparent"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                {isActive && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-fg" aria-hidden />}
                <span className="flex items-center justify-between gap-2">
                  <span className={`font-mono text-xs font-medium ${isActive ? "text-fg" : "text-fg-muted"}`}>{t.id}</span>
                  {isSolved ? (
                    <span className="flex items-center gap-1 text-[10.5px] font-medium text-verified">
                      <CheckCircle2 className="size-3" aria-hidden /> Saved
                    </span>
                  ) : (
                    <PriorityBadge priority={t.priority} />
                  )}
                </span>
                <span className={`truncate text-[12.5px] font-medium ${isSolved ? "text-fg-muted" : "text-fg"}`}>{t.customer}</span>
                <span className="truncate text-[11.5px] text-fg-faint">{t.issue}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
