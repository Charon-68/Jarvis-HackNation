/**
 * Responsive multi-pane workspace.
 * ≥ 1024px: panes side by side, separated by hairlines.
 * < 1024px: a segmented tab bar shows one pane at a time. Hidden panes stay
 * mounted (CSS only), so live state such as the voice panel is preserved.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface Pane {
  id: string;
  label: string;
  icon: LucideIcon;
  /** CSS grid track on desktop, e.g. "232px" or "minmax(0,1fr)". */
  width: string;
  node: ReactNode;
  /** Small indicator shown on the mobile tab (e.g. a live dot or count). */
  badge?: ReactNode;
}

export default function Workspace({
  panes,
  initial,
  follow,
}: {
  panes: Pane[];
  initial?: string;
  /** When `key` changes, the tab bar jumps to `pane` (e.g. show the ticket after picking one). */
  follow?: { pane: string; key: unknown };
}) {
  const [active, setActive] = useState(initial ?? panes[0]?.id);
  const lastKey = useRef(follow?.key);
  useEffect(() => {
    if (!follow || follow.key === lastKey.current) return;
    lastKey.current = follow.key;
    if (follow.key != null) setActive(follow.pane);
  }, [follow]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Mobile / tablet tab bar */}
      <div role="tablist" aria-label="Workspace panes" className="flex shrink-0 gap-1 border-b border-line bg-surface/60 p-1.5 lg:hidden">
        {panes.map((p) => {
          const Icon = p.icon;
          const selected = p.id === active;
          return (
            <button
              key={p.id}
              role="tab"
              aria-selected={selected}
              aria-controls={`pane-${p.id}`}
              onClick={() => setActive(p.id)}
              className={`focus-ring relative flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition ${
                selected ? "bg-raised text-fg ring-1 ring-line-strong" : "text-fg-muted hover:text-fg"
              }`}
            >
              <Icon className={`size-3.5 ${selected ? "text-signal" : ""}`} aria-hidden />
              {p.label}
              {p.badge}
            </button>
          );
        })}
      </div>

      <div
        className="grid min-h-0 flex-1 lg:[grid-template-columns:var(--cols)]"
        style={{ ["--cols" as string]: panes.map((p) => p.width).join(" ") }}
      >
        {panes.map((p, i) => (
          <section
            key={p.id}
            id={`pane-${p.id}`}
            role="tabpanel"
            aria-label={p.label}
            className={`min-h-0 min-w-0 overflow-hidden bg-surface/40 ${i < panes.length - 1 ? "lg:border-r lg:border-line" : ""} ${
              p.id === active ? "" : "max-lg:hidden"
            }`}
          >
            {p.node}
          </section>
        ))}
      </div>
    </div>
  );
}
