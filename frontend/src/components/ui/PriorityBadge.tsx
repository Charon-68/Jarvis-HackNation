/**
 * Ticket priority as a compact badge. Emergency uses the `stop` role (the
 * only red in the system), Moderate uses amber, Low stays neutral.
 */
const STYLE: Record<string, { dot: string; text: string; ring: string }> = {
  // Outline only: solid red is reserved for guardrails and blocked saves.
  Emergency: { dot: "bg-stop", text: "text-fg", ring: "ring-stop/45 bg-transparent" },
  Moderate: { dot: "bg-amber", text: "text-amber", ring: "ring-amber/30 bg-amber/10" },
  "Low Priority": { dot: "bg-fg-faint", text: "text-fg-muted", ring: "ring-line-strong bg-raised" },
};

export function priorityTone(p: string) {
  return STYLE[p] ?? STYLE["Low Priority"];
}

export default function PriorityBadge({ priority, size = "sm" }: { priority: string; size?: "sm" | "md" }) {
  const s = priorityTone(priority);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium ring-1 ${s.ring} ${s.text} ${
        size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10.5px]"
      }`}
    >
      <span className={`size-1.5 rounded-full ${s.dot}`} aria-hidden />
      {priority}
    </span>
  );
}
