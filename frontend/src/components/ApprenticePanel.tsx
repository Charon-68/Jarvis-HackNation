/**
 * P1-04, P1-07, P1-09 — AI Apprentice Side Panel
 * Provider-neutral panel showing agent presence (SignalOrb), messages, and the
 * ScreenEvent activity stream. Does NOT expose raw Claude or provider payloads.
 */

import { AnimatePresence, motion } from "motion/react";
import { BookOpenText, CircleHelp, Info, MessageSquare, OctagonAlert } from "lucide-react";
import type { AgentMessage, ScreenEvent } from "../types/index";
import ScreenEventTimeline from "./ScreenEventTimeline";
import SignalOrb, { orbStateFrom, type OrbState } from "./SignalOrb";
import { flag } from "@/lib/route";

interface ApprenticePanelProps {
  agentStatus: string;
  messages: AgentMessage[];
  screenEvents: ScreenEvent[];
  /** Optional slot for external/embedded voice control */
  elevenLabsSlot?: React.ReactNode;
  onSelectEvent?: (event: ScreenEvent) => void;
  /** "tutor" in Training; changes the title and copy. */
  variant?: "apprentice" | "tutor";
  /** The tutor is blocking a decision: orb and header turn red. */
  alert?: boolean;
}

function formatTs(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const KIND = {
  question: { icon: CircleHelp, label: "Apprentice question", tone: "signal" },
  answer: { icon: MessageSquare, label: "AI Apprentice", tone: "neutral" },
  status: { icon: Info, label: "AI Apprentice", tone: "neutral" },
  intervention: { icon: OctagonAlert, label: "Tutor intervention", tone: "stop" },
  teach_back: { icon: BookOpenText, label: "Teach-back", tone: "signal" },
} as const;

const TONE = {
  signal: "border-signal/30 bg-signal/[0.07]",
  neutral: "border-line bg-raised/70",
  stop: "border-stop/35 bg-stop/10",
} as const;

const STATE_COPY: Record<OrbState, string> = {
  offline: "Offline",
  connecting: "Connecting…",
  listening: "Listening",
  speaking: "Speaking",
  alert: "Flagging a decision",
  error: "Voice unavailable",
};

function MessageBubble({ msg }: { msg: AgentMessage }) {
  const isAgent = msg.role === "agent";
  const kind = KIND[msg.kind as keyof typeof KIND] ?? KIND.answer;
  const Icon = kind.icon;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col ${isAgent ? "items-start" : "items-end"}`}
    >
      <div
        className={`max-w-[94%] rounded-xl border px-3 py-2.5 text-[12.5px] leading-relaxed ${
          isAgent ? `${TONE[kind.tone]} rounded-tl-sm text-fg` : "rounded-tr-sm border-transparent bg-signal text-signal-ink"
        }`}
      >
        {isAgent && (
          <div
            className={`hud-tag mb-1 flex items-center gap-1.5 ${
              kind.tone === "stop" ? "text-stop" : kind.tone === "signal" ? "text-signal" : "text-fg-faint"
            }`}
          >
            <Icon className="size-3" aria-hidden />
            {kind.label}
          </div>
        )}
        <div className={msg.kind === "intervention" ? "text-[#ffd2cc]" : ""}>{msg.text}</div>
      </div>
      <span className="mx-0.5 mt-1 font-mono text-[10px] text-fg-faint">{formatTs(msg.timestampMs)}</span>
    </motion.li>
  );
}

export default function ApprenticePanel({
  agentStatus,
  messages,
  screenEvents,
  elevenLabsSlot,
  onSelectEvent,
  variant = "apprentice",
  alert = false,
}: ApprenticePanelProps) {
  // QA switch: ?orb=speaking|listening|alert|… forces a presence state.
  const forced = flag("orb") as OrbState | null;
  const orbState: OrbState = forced && forced in STATE_COPY ? forced : orbStateFrom(agentStatus, alert);
  const live = orbState === "listening" || orbState === "speaking" || orbState === "connecting";
  const title = variant === "tutor" ? "AI Tutor" : "AI Apprentice";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Presence */}
      <div
        className={`relative shrink-0 overflow-hidden border-b px-4 py-4 transition-colors duration-500 ${
          orbState === "alert" ? "border-stop/30 bg-stop/[0.06]" : "border-line"
        }`}
      >
        <div className="flex items-center gap-4">
          <SignalOrb state={orbState} size={64} />
          <div className="min-w-0">
            <div className="text-sm font-medium text-fg">{title}</div>
            <div
              aria-live="polite"
              className={`hud-tag mt-1 flex items-center gap-1.5 ${
                orbState === "alert" ? "text-stop" : live ? "text-signal" : "text-fg-faint"
              }`}
            >
              {live && <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />}
              {STATE_COPY[orbState]}
            </div>
            <div className="mt-1.5 text-[11.5px] leading-snug text-fg-muted">
              {variant === "tutor" ? "Coaching from the expert's Work Map" : "Watching the screen, asking why"}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded ElevenLabs slot if provided */}
      {elevenLabsSlot && <div className="shrink-0 border-b border-line">{elevenLabsSlot}</div>}

      {/* Messages area */}
      <div
        className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3"
        ref={(el) => {
          if (el) el.scrollTop = el.scrollHeight;
        }}
      >
        {messages.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="text-[13px] font-medium text-fg">Listening quietly</div>
            <div className="mt-1 text-xs text-fg-muted">Observing triage actions and capturing expert reasoning…</div>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* Task P1-09: ScreenEvent Timeline & Activity stream */}
      <div className="max-h-[190px] shrink-0 overflow-y-auto border-t border-line bg-ink/40 px-3.5 py-2.5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="hud-tag m-0 text-fg-faint">Workflow activity</h3>
          <span className="font-mono text-[10px] text-fg-faint">{screenEvents.length} events</span>
        </div>
        <ScreenEventTimeline events={screenEvents} maxItems={8} onSelectEvent={onSelectEvent} />
      </div>
    </div>
  );
}
