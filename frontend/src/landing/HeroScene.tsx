/**
 * React wrapper around ApprenticeCore. Lazy-loads three.js, falls back to a
 * CSS orb when WebGL is unavailable, software-rendered, or ?webgl=off.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ApprenticeCore, Quality } from "@/engine/ApprenticeCore";
import { flag, prefersReducedMotion } from "@/lib/route";

export interface HeroSceneHandle {
  setProgress(p: number): void;
  launch(): Promise<void>;
}

interface Props {
  onAnchors?: (anchors: Array<{ x: number; y: number; visible: boolean }>) => void;
}

const HeroScene = forwardRef<HeroSceneHandle, Props>(function HeroScene({ onAnchors }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<ApprenticeCore | null>(null);
  const pending = useRef(0);
  const anchorsCb = useRef(onAnchors);
  anchorsCb.current = onAnchors;
  const [mode, setMode] = useState<"loading" | "webgl" | "fallback">("loading");

  useImperativeHandle(ref, () => ({
    setProgress(p) {
      pending.current = p;
      engine.current?.setProgress(p);
    },
    launch() {
      return engine.current?.launch() ?? Promise.resolve();
    },
  }));

  useEffect(() => {
    if (flag("webgl") === "off") {
      setMode("fallback");
      return;
    }
    let cancelled = false;
    import("@/engine/ApprenticeCore")
      .then(({ ApprenticeCore }) => {
        if (cancelled || !host.current) return;
        const q = flag("quality");
        engine.current = new ApprenticeCore(host.current, {
          quality: q === "high" || q === "low" ? (q as Quality) : undefined,
          reducedMotion: prefersReducedMotion(),
          onFrame: (a) => anchorsCb.current?.(a),
        });
        engine.current.setProgress(pending.current);
        setMode("webgl");
      })
      .catch((err) => {
        console.info("[HeroScene] WebGL unavailable, using fallback:", (err as Error).message);
        if (!cancelled) setMode("fallback");
      });
    return () => {
      cancelled = true;
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);

  return (
    <div ref={host} className="absolute inset-0" aria-hidden="true">
      {mode !== "webgl" && (
        <div
          className="absolute rounded-full transition-opacity duration-700"
          style={{
            width: "min(46vmin, 420px)",
            aspectRatio: "1",
            right: "18%",
            top: "50%",
            transform: "translateY(-50%)",
            opacity: mode === "loading" ? 0.35 : 1,
            background:
              "radial-gradient(circle at 38% 34%, #f3ffd6 0%, #c8f65a 18%, #4f6b16 46%, rgba(9,9,11,0) 70%)",
            boxShadow: "0 0 120px 10px rgba(200,246,90,0.18)",
          }}
        />
      )}
    </div>
  );
});

export default HeroScene;
