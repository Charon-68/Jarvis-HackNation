/**
 * P1-01 — Session launcher.
 * Choose Expert Capture or New Hire Training, enter a name, start.
 * Session logic is unchanged; only presentation was redesigned (M2).
 */
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, GraduationCap, Mic, ShieldAlert } from "lucide-react";
import { useSession } from "../store/sessionStore";
import { rovingKeyDown } from "../lib/a11y";
import SignalOrb from "../components/SignalOrb";

const MODES = {
  expert: {
    icon: Mic,
    title: "Expert capture",
    tag: "Capture → Map",
    body: "Process support tickets T001 → T002 → T003 → T005 → T006 while the AI Apprentice observes and asks questions. Finish with a debrief to generate the Work Map.",
    field: { id: "expert-name", label: "Expert name", placeholder: "Your name" },
    cta: "Begin expert session",
  },
  training: {
    icon: GraduationCap,
    title: "New hire training",
    tag: "Teach",
    body: "Tackle an unseen case with guidance from the trained AI tutor. The tutor will block unsafe decisions and guide you using the expert's learned knowledge.",
    field: { id: "trainee-name", label: "Trainee name", placeholder: "New hire name" },
    cta: "Begin training session",
  },
} as const;

const EASE = [0.16, 1, 0.3, 1] as const;

export default function HomeScreen() {
  const { startExpertSession, startTrainingSession, state } = useSession();
  const [expertName, setExpertName] = useState("Jane Expert");
  const [traineeName, setTraineeName] = useState("New Hire");
  const [mode, setMode] = useState<"expert" | "training">("expert");
  const m = MODES[mode];
  const name = mode === "expert" ? expertName : traineeName;
  const setName = mode === "expert" ? setExpertName : setTraineeName;

  const handleStart = async () => {
    if (mode === "expert") {
      await startExpertSession(expertName || "Expert");
    } else {
      await startTrainingSession(traineeName || "Trainee");
    }
  };

  return (
    <div className="relative h-full overflow-y-auto">
      {/* Ambient backdrop: dot grid + signal glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(70%_60%_at_50%_40%,black,transparent)]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_35%_at_72%_38%,rgba(200,246,90,0.10),transparent)]" />

      <div className="relative mx-auto grid min-h-full max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_minmax(0,460px)] lg:gap-16">
        {/* Copy */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
          <SignalOrb state="listening" size={84} className="mb-6" />
          <p className="hud-tag mb-5 text-fg-muted">
            <span className="text-signal">●</span> Console · Support ticket triage
          </p>
          <h1 className="max-w-[14ch] font-display text-title font-normal tracking-normal">
            Watch an expert work. <span className="italic text-signal">Teach it to new hires.</span>
          </h1>
          <p className="mt-5 max-w-[44ch] text-[15px] leading-relaxed text-fg-muted">
            Capture the expert&apos;s reasoning while they triage, turn it into a verified Work Map, then let the tutor coach a new hire on a case they haven&apos;t seen.
          </p>
          <ul className="mt-8 hidden gap-3 text-sm text-fg-muted sm:grid">
            {[
              ["01", "Live “why?” questions at natural pauses"],
              ["02", "Debrief and teach-back build the Work Map"],
              ["03", "Unsafe saves are blocked and explained"],
            ].map(([n, t]) => (
              <li key={n} className="flex items-center gap-3">
                <span className="hud-tag text-fg-faint">{n}</span>
                <span className="h-px w-5 bg-line-strong" />
                {t}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Launcher card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.08, ease: EASE }}
          className="glass relative rounded-2xl p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] sm:p-6"
        >
          <div
            role="radiogroup"
            aria-label="Session mode"
            className="grid grid-cols-2 gap-2"
            onKeyDown={(e) => rovingKeyDown(e, ["expert", "training"] as const, mode, setMode)}
          >
            {(["expert", "training"] as const).map((k) => {
              const Icon = MODES[k].icon;
              const selected = k === mode;
              return (
                <button
                  key={k}
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  aria-label={`${MODES[k].title} (${MODES[k].tag})`}
                  onClick={() => setMode(k)}
                  className={`focus-ring relative flex flex-col items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                    selected
                      ? "border-signal/50 bg-signal/[0.07] shadow-[inset_0_0_24px_rgba(200,246,90,0.06)]"
                      : "border-line bg-raised/60 hover:border-line-strong"
                  }`}
                >
                  <span
                    className={`grid size-8 place-items-center rounded-lg ${selected ? "bg-signal text-signal-ink" : "bg-ink text-fg-muted ring-1 ring-line"}`}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span>
                    <span className={`block text-sm font-medium ${selected ? "text-fg" : "text-fg-muted"}`}>{MODES[k].title}</span>
                    <span className="hud-tag text-fg-faint">{MODES[k].tag}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <label htmlFor={m.field.id} className="hud-tag mt-6 block text-fg-faint">
            {m.field.label}
          </label>
          <input
            id={m.field.id}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !state.loading) handleStart();
            }}
            placeholder={m.field.placeholder}
            className="mt-2 w-full rounded-lg border border-line bg-ink/70 px-3 py-2.5 text-sm text-fg outline-none transition placeholder:text-fg-faint focus:border-signal/60 focus:ring-2 focus:ring-signal/20"
          />

          <p className="mt-5 rounded-lg border border-line bg-ink/40 px-3.5 py-3 text-[13px] leading-relaxed text-fg-muted">
            {m.body}
          </p>

          {state.error && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-stop/30 bg-stop/10 px-3.5 py-2.5 text-[13px] text-stop">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {state.error}
            </p>
          )}

          <button
            id="start-session-btn"
            onClick={handleStart}
            disabled={state.loading}
            className="focus-ring group mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-signal px-5 py-3 text-[15px] font-medium text-signal-ink shadow-[0_0_32px_rgba(200,246,90,0.22)] transition hover:bg-[#d6ff78] disabled:cursor-wait disabled:opacity-70"
          >
            {state.loading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-signal-ink/30 border-t-signal-ink" /> Starting…
              </>
            ) : (
              <>
                {m.cta}
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
              </>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
