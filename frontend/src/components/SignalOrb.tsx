/**
 * SignalOrb — React wrapper for OrbRenderer (lazy-loaded three.js).
 * Shows a CSS orb while loading, when WebGL is unavailable, or with ?webgl=off.
 */
import { useEffect, useRef, useState } from "react";
import type { OrbRenderer, OrbState } from "@/engine/OrbRenderer";
import { flag, prefersReducedMotion } from "@/lib/route";

export type { OrbState };

/** Map the voice adapter's free-form status string (+ tutor alert) onto an orb state. */
export function orbStateFrom(agentStatus: string, alert = false): OrbState {
  if (alert) return "alert";
  switch (agentStatus) {
    case "speaking":
      return "speaking";
    case "listening":
    case "connected":
      return "listening";
    case "connecting":
      return "connecting";
    case "error":
      return "error";
    default:
      return "offline";
  }
}

const HALO: Record<OrbState, string> = {
  offline: "rgba(150,160,130,0.10)",
  connecting: "rgba(200,246,90,0.18)",
  listening: "rgba(200,246,90,0.28)",
  speaking: "rgba(200,246,90,0.45)",
  alert: "rgba(255,93,82,0.45)",
  error: "rgba(140,140,150,0.10)",
};

export default function SignalOrb({ state, size = 72, className = "" }: { state: OrbState; size?: number; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const orb = useRef<OrbRenderer | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [webgl, setWebgl] = useState(false);

  useEffect(() => {
    if (flag("webgl") === "off") return;
    let cancelled = false;
    import("@/engine/OrbRenderer")
      .then(({ OrbRenderer }) => {
        if (cancelled || !host.current) return;
        orb.current = new OrbRenderer(host.current, prefersReducedMotion(), () => {
          // Context lost (e.g. GPU reset or too many contexts): show the CSS orb.
          orb.current?.dispose();
          orb.current = null;
          setWebgl(false);
        });
        orb.current.setState(stateRef.current);
        setWebgl(true);
      })
      .catch(() => {
        /* CSS fallback stays visible */
      });
    return () => {
      cancelled = true;
      orb.current?.dispose();
      orb.current = null;
    };
  }, []);

  useEffect(() => {
    orb.current?.setState(state);
  }, [state]);

  const alert = state === "alert";
  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Apprentice is ${state === "alert" ? "flagging a decision" : state}`}
    >
      {/* Halo (bloom stand-in) */}
      <div
        aria-hidden
        className={`absolute -inset-[35%] rounded-full blur-xl transition-[background-color] duration-700 ${state === "speaking" || alert ? "animate-pulse" : ""}`}
        style={{ background: `radial-gradient(circle, ${HALO[state]} 0%, transparent 65%)` }}
      />
      {/* CSS orb (fallback / while loading) */}
      {!webgl && (
        <div
          aria-hidden
          className="absolute inset-[8%] rounded-full transition-[background] duration-700"
          style={{
            background: alert
              ? "radial-gradient(circle at 38% 34%, #ffd2cc 0%, #ff5d52 30%, #4a1310 70%)"
              : state === "offline" || state === "error"
                ? "radial-gradient(circle at 38% 34%, #9a9d90 0%, #45473f 40%, #121310 75%)"
                : "radial-gradient(circle at 38% 34%, #f3ffd6 0%, #c8f65a 28%, #2d3c0c 72%)",
          }}
        />
      )}
      <div ref={host} aria-hidden className="absolute inset-0" />
    </div>
  );
}
