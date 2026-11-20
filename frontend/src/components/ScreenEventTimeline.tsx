/**
 * P1-09 — ScreenEvent UI Consumer & Activity Timeline
 * Displays a concise semantic event stream (ticket opened, priority changed, etc.)
 * Filters out raw Claude output or internal JSON.
 */

import { AnimatePresence, motion } from "motion/react";
import { FolderOpen, Gauge, Radio, Save, Users, Zap, type LucideIcon } from "lucide-react";
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

const TYPE: Record<string, { icon: LucideIcon; tone: string }> = {
  ticket_opened: { icon: FolderOpen, tone: "text-signal" },
  priority_changed: { icon: Gauge, tone: "text-amber" },
  team_changed: { icon: Users, tone: "text-fg-muted" },
  action_changed: { icon: Zap, tone: "text-fg" },
  decision_saved: { icon: Save, tone: "text-verified" },
};
const FALLBACK = { icon: Radio, tone: "text-fg-faint" };

export default function ScreenEventTimeline({ events, maxItems = 10, highlightedEventId, onSelectEvent }: ScreenEventTimelineProps) {
  const displayEvents = [...events].reverse().slice(0, maxItems);

  if (displayEvents.length === 0) {
    return <p className="py-2 text-center text-[11.5px] text-fg-faint">No screen activity recorded yet.</p>;
  }

  return (
    <ol className="relative flex flex-col">
      {/* spine */}
      <span className="absolute bottom-3 left-[11px] top-3 w-px bg-line-strong" aria-hidden />
      <AnimatePresence initial={false}>
        {displayEvents.map((evt) => {
          const t = TYPE[evt.type] ?? FALLBACK;
          const Icon = t.icon;
          const isHighlighted = highlightedEventId === evt.id;
          const Tag = onSelectEvent ? "button" : "div";

          return (
            <motion.li
              key={evt.id}
              layout
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Tag
                {...(onSelectEvent ? { onClick: () => onSelectEvent(evt), type: "button" as const } : {})}
                className={`relative flex w-full items-start gap-2.5 rounded-md py-1.5 pr-1 text-left text-[11.5px] ${
                  onSelectEvent ? "focus-ring cursor-pointer hover:bg-raised/60" : ""
                } ${isHighlighted ? "bg-signal/[0.06]" : ""}`}
              >
                <span className="relative z-10 grid size-[23px] shrink-0 place-items-center rounded-full border border-line bg-surface">
                  <Icon className={`size-3 ${t.tone}`} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-medium text-fg">{evt.ticketId ?? "Workflow"}</span>
                    <span className="font-mono text-[10px] text-fg-faint">{formatEventTime(evt.timestampMs)}</span>
                  </span>
                  <span className="mt-0.5 block leading-snug text-fg-muted">{evt.description}</span>
                  {evt.newValue && <span className={`mt-1 inline-block font-mono text-[10.5px] ${t.tone}`}>→ {evt.newValue}</span>}
                </span>
              </Tag>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
