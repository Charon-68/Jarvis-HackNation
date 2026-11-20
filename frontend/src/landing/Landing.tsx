/**
 * Landing page — "/".
 * A fixed WebGL stage (ApprenticeCore) sits behind a native-scroll document.
 * The pinned story section maps its scroll progress onto the 3D formations.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { ArrowRight, ArrowUpRight, FolderGit2, ShieldCheck, EyeOff, Link2 } from "lucide-react";
import HeroScene, { type HeroSceneHandle } from "./HeroScene";
import { landing } from "@/content/landing";
import { prefersReducedMotion } from "@/lib/route";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Landing({ onLaunch }: { onLaunch: () => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const story = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const scene = useRef<HeroSceneHandle>(null);
  const tagEls = useRef<Array<HTMLDivElement | null>>([]);
  const captureWeight = useRef(0);
  const mapWeight = useRef(0);
  const [beat, setBeat] = useState(-1); // -1 = hero, 0..2 = story beats
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    document.title = "AI Apprentice — learns why your experts decide";
  }, []);

  const onScroll = useCallback(() => {
    const el = scroller.current;
    const st = story.current;
    if (!el || !st) return;
    const vh = el.clientHeight;
    const top = st.offsetTop;
    const span = st.offsetHeight - vh;
    const p = Math.min(1, Math.max(0, (el.scrollTop - top) / span));
    scene.current?.setProgress(p);

    const s = p * 3;
    captureWeight.current = Math.max(0, 1 - Math.abs(s - 1) * 1.6);
    mapWeight.current = Math.max(0, 1 - Math.abs(s - 2) * 1.6);
    setBeat(el.scrollTop < top - vh * 0.35 ? -1 : Math.min(2, Math.floor(p * 3 * 0.999 + 0.0001)));

    // Dim the stage once the story is over so later sections read cleanly.
    const after = (el.scrollTop - (top + span)) / vh;
    if (stage.current) stage.current.style.opacity = String(1 - 0.8 * Math.min(1, Math.max(0, after)));
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [onScroll]);

  const onAnchors = useCallback((anchors: Array<{ x: number; y: number; visible: boolean }>) => {
    anchors.forEach((a, i) => {
      const tag = tagEls.current[i];
      if (!tag) return;
      // The guardrail tag (last) also labels its red node in the Map beat.
      const w = i === anchors.length - 1 ? Math.max(captureWeight.current, mapWeight.current) : captureWeight.current;
      tag.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
      tag.style.opacity = String(a.visible ? w : 0);
    });
  }, []);

  const launchingRef = useRef(false);
  const launch = useCallback(async () => {
    if (launchingRef.current) return;
    launchingRef.current = true;
    setLaunching(true);
    await Promise.all([scene.current?.launch(), new Promise((r) => setTimeout(r, 450))]);
    onLaunch();
  }, [onLaunch]);

  const scrollToStory = () => story.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });

  return (
    <MotionConfig reducedMotion={prefersReducedMotion() ? "always" : "user"}>
      <div className="fixed inset-0 bg-ink text-fg font-sans">
        {/* 3D stage */}
        <div ref={stage} className="pointer-events-none absolute inset-0 transition-opacity duration-300">
          <HeroScene ref={scene} onAnchors={onAnchors} />
          {/* Readability scrim for the copy column */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,11,0.92)_0%,rgba(9,9,11,0.55)_38%,rgba(9,9,11,0)_62%)] max-md:bg-[linear-gradient(0deg,rgba(9,9,11,0.95)_0%,rgba(9,9,11,0.6)_45%,rgba(9,9,11,0.1)_75%)]" />
          {/* HUD tags pinned to shards (capture beat) */}
          {landing.captureTags.map((t, i) => (
            <div
              key={t.k}
              ref={(el) => {
                tagEls.current[i] = el;
              }}
              className="absolute left-0 top-0 opacity-0 will-change-transform max-sm:hidden"
            >
              <div className="-translate-x-1/2 -translate-y-[calc(100%+14px)] flex flex-col items-center">
                <div className="glass hud-tag whitespace-nowrap rounded-md px-2.5 py-1.5 text-fg">
                  <span className={t.k === "Guardrail" ? "text-stop" : "text-signal"}>{t.k}</span>
                  <span className="text-fg-muted"> · {t.v}</span>
                </div>
                <div className="h-3.5 w-px bg-signal/60" />
                <div className="size-1.5 rounded-full bg-signal" />
              </div>
            </div>
          ))}
        </div>

        {/* Nav */}
        <header className="absolute inset-x-0 top-0 z-20 px-4 pt-4 sm:px-6">
          <nav className="glass mx-auto flex h-12 max-w-6xl items-center gap-4 rounded-xl px-4" aria-label="Primary">
            <a href="/" className="focus-ring flex items-center gap-2 rounded text-sm font-medium tracking-tight">
              <span className="size-2.5 rounded-full bg-signal shadow-[0_0_12px_2px_rgba(200,246,90,0.6)]" />
              AI Apprentice
            </a>
            <span className="hud-tag hidden text-fg-faint md:inline">Support triage</span>
            <div className="ml-auto flex items-center gap-1 text-sm text-fg-muted">
              <button onClick={scrollToStory} className="focus-ring hidden rounded-md px-3 py-1.5 hover:text-fg sm:block">
                How it works
              </button>
              <a href="#demo" className="focus-ring hidden rounded-md px-3 py-1.5 hover:text-fg sm:block">
                Demo
              </a>
              <button
                onClick={launch}
                className="focus-ring ml-1 flex items-center gap-1.5 rounded-lg bg-signal px-3.5 py-1.5 font-medium text-signal-ink transition hover:bg-[#d6ff78]"
              >
                Launch console <ArrowRight className="size-3.5" aria-hidden />
              </button>
            </div>
          </nav>
        </header>

        {/* Scroll document */}
        <div ref={scroller} className="relative z-10 h-full overflow-y-auto overflow-x-hidden scroll-smooth">
          <main>
            {/* Hero */}
            <section className="mx-auto flex min-h-svh max-w-6xl flex-col justify-center px-4 pb-24 pt-28 sm:px-6 max-md:justify-end">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: EASE }}
                className="hud-tag mb-6 text-fg-muted"
              >
                <span className="text-signal">●</span> {landing.eyebrow}
              </motion.p>
              <h1 className="max-w-[13ch] font-display text-display font-normal tracking-[-0.02em]">
                {landing.hero.lines.map((line, i) => (
                  <motion.span
                    key={line}
                    className={`block ${i === 2 ? "text-signal italic" : ""}`}
                    initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 1, delay: 0.15 + i * 0.14, ease: EASE }}
                  >
                    {line}
                  </motion.span>
                ))}
              </h1>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.6, ease: EASE }}
                className="mt-7 max-w-[46ch] text-base leading-relaxed text-fg-muted sm:text-lg"
              >
                {landing.hero.sub}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.75, ease: EASE }}
                className="mt-9 flex flex-wrap items-center gap-3"
              >
                <button
                  onClick={launch}
                  className="focus-ring group flex items-center gap-2 rounded-xl bg-signal px-5 py-3 text-[15px] font-medium text-signal-ink shadow-[0_0_32px_rgba(200,246,90,0.25)] transition hover:bg-[#d6ff78]"
                >
                  {landing.hero.primary}
                  <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
                </button>
                <button
                  onClick={scrollToStory}
                  className="focus-ring glass rounded-xl px-5 py-3 text-[15px] text-fg transition hover:border-line-strong"
                >
                  {landing.hero.secondary}
                </button>
              </motion.div>
            </section>

            {/* Pinned story: Capture → Map → Teach */}
            <section ref={story} id="story" className="relative h-[360svh]" aria-label="How it works">
              <div className="sticky top-0 flex h-svh items-center">
                <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 max-md:self-end max-md:pb-16">
                  {/* Stage rail */}
                  <ol className="mb-8 flex items-center gap-3" aria-label="Stages">
                    {landing.beats.map((b, i) => (
                      <li key={b.id} className="flex items-center gap-3">
                        <span
                          className={`hud-tag flex items-center gap-2 transition-colors duration-500 ${
                            i === beat ? "text-signal" : i < beat ? "text-fg-muted" : "text-fg-faint"
                          }`}
                          aria-current={i === beat ? "step" : undefined}
                        >
                          <span
                            className={`size-1.5 rounded-full transition-colors duration-500 ${
                              i <= beat ? "bg-signal" : "bg-fg-faint"
                            }`}
                          />
                          {b.label}
                        </span>
                        {i < 2 && <span className="h-px w-6 bg-line-strong sm:w-10" />}
                      </li>
                    ))}
                  </ol>
                  <div className="relative min-h-[15rem] max-w-[30rem]">
                    <AnimatePresence mode="wait">
                      {beat >= 0 && (
                        <motion.div
                          key={landing.beats[beat].id}
                          initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
                          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                          exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
                          transition={{ duration: 0.55, ease: EASE }}
                        >
                          <p className="hud-tag mb-4 text-fg-faint">
                            {landing.beats[beat].index} / 03
                          </p>
                          <h2 className="font-display text-title font-normal tracking-[-0.01em]">
                            {landing.beats[beat].title}
                          </h2>
                          <p className="mt-5 text-base leading-relaxed text-fg-muted">{landing.beats[beat].body}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </section>

            {/* Demo */}
            <section id="demo" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-28 sm:px-6">
              <Reveal>
                <p className="hud-tag mb-4 text-signal">{landing.demo.label}</p>
                <h2 className="font-display text-title font-normal">{landing.demo.title}</h2>
              </Reveal>
              <Reveal delay={0.1}>
                <figure className="glass mt-10 overflow-hidden rounded-2xl p-2">
                  <div className="flex items-center gap-1.5 px-3 py-2">
                    <span className="size-2 rounded-full bg-fg-faint/60" />
                    <span className="size-2 rounded-full bg-fg-faint/60" />
                    <span className="size-2 rounded-full bg-fg-faint/60" />
                    <span className="hud-tag ml-3 text-fg-faint">support-triage · apprentice</span>
                  </div>
                  <video
                    className="aspect-video w-full rounded-xl bg-black"
                    src={landing.demo.src}
                    aria-label="Demo video: AI Apprentice support triage walkthrough"
                    controls
                    preload="metadata"
                    playsInline
                  />
                  <figcaption className="hud-tag px-3 py-3 text-fg-faint">{landing.demo.caption}</figcaption>
                </figure>
              </Reveal>
            </section>

            {/* Trust */}
            <section className="mx-auto grid max-w-6xl gap-px overflow-hidden rounded-2xl border border-line bg-line px-0 sm:grid-cols-3 mx-4 sm:mx-6 lg:mx-auto">
              {landing.trust.map((t, i) => {
                const Icon = [EyeOff, ShieldCheck, Link2][i];
                return (
                  <Reveal key={t.title} delay={i * 0.08} className="bg-ink p-7">
                    <Icon className="mb-5 size-5 text-signal" aria-hidden />
                    <h3 className="text-[15px] font-medium normal-case tracking-normal text-fg">{t.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">{t.body}</p>
                  </Reveal>
                );
              })}
            </section>

            {/* Closing CTA + footer */}
            <section className="relative mt-32 overflow-hidden">
              <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
                <Reveal>
                  <h2 className="mx-auto max-w-[18ch] font-display text-title font-normal">{landing.closing.title}</h2>
                </Reveal>
                <Reveal delay={0.1}>
                  <button
                    onClick={launch}
                    className="focus-ring group mx-auto mt-10 flex items-center gap-2 rounded-xl bg-signal px-6 py-3.5 text-[15px] font-medium text-signal-ink shadow-[0_0_40px_rgba(200,246,90,0.3)] transition hover:bg-[#d6ff78]"
                  >
                    {landing.closing.cta}
                    <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
                  </button>
                </Reveal>
              </div>
              <footer className="mx-auto mt-28 max-w-6xl px-4 sm:px-6">
                <div className="flex flex-col gap-3 border-t border-line py-6 text-sm text-fg-faint sm:flex-row sm:items-center sm:justify-between">
                  <span>{landing.footer.credit}</span>
                  <a
                    href={landing.footer.repo}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring flex items-center gap-1.5 rounded hover:text-fg"
                  >
                    <FolderGit2 className="size-4" aria-hidden /> Source on GitHub <ArrowUpRight className="size-3.5" aria-hidden />
                  </a>
                </div>
                <p
                  aria-hidden
                  className="select-none whitespace-nowrap text-center font-display leading-[0.8] tracking-[-0.03em] text-transparent [-webkit-text-stroke:1px_rgba(200,246,90,0.35)] text-[clamp(4rem,19vw,17rem)] translate-y-[18%]"
                >
                  Apprentice
                </p>
              </footer>
            </section>
          </main>
        </div>

        {/* Launch transition veil */}
        <AnimatePresence>
          {launching && (
            <motion.div
              className="pointer-events-none absolute inset-0 z-30 bg-ink"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.25, ease: "easeIn" }}
            />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
