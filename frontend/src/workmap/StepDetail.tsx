/**
 * Full detail for one Work Map step: the expert's "why" set as a serif margin
 * note, rationale, teaching point, guardrails, exceptions and evidence link.
 * Used by the graph inspector and the list view.
 */
import { BookOpenText, Image as ImageIcon, OctagonAlert, Split } from "lucide-react";
import type { WorkMapStep } from "@/types";

export default function StepDetail({
  step,
  onEvidence,
  headingLevel = 2,
}: {
  step: WorkMapStep;
  onEvidence: (s: WorkMapStep) => void;
  headingLevel?: 2 | 3;
}) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="flex flex-col gap-5">
      <header>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-signal/10 px-2 py-0.5 font-mono text-[11px] text-signal ring-1 ring-signal/25">
            Step {String(step.stepNumber).padStart(2, "0")}
            {step.ticketId ? ` · ${step.ticketId}` : ""}
          </span>
          {step.sourceEventIds && step.sourceEventIds.length > 0 && (
            <span className="font-mono text-[10.5px] text-fg-faint">{step.sourceEventIds.length} screen events</span>
          )}
        </div>
        <H className="m-0 text-[15px] font-medium normal-case leading-snug tracking-normal text-fg">{step.observedAction}</H>
        <div className="mt-2.5 inline-flex rounded-md border border-line bg-ink/60 px-2 py-1 font-mono text-[11px] text-fg-muted">{step.decision}</div>
      </header>

      {step.expertQuote && (
        <figure className="border-l-2 border-signal/70 pl-4">
          <figcaption className="hud-tag mb-1.5 text-fg-faint">Why, in the expert&apos;s words</figcaption>
          <blockquote className="font-display text-[22px] leading-[1.2] text-fg">&ldquo;{step.expertQuote}&rdquo;</blockquote>
        </figure>
      )}

      <section>
        <p className="hud-tag mb-1.5 text-fg-faint">Expert rationale</p>
        <p className="text-[13px] leading-relaxed text-fg-muted">{step.expertReason}</p>
      </section>

      {step.teachingPoint && (
        <section className="flex gap-2.5 rounded-lg border border-line bg-raised/60 px-3 py-2.5">
          <BookOpenText className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />
          <div>
            <p className="hud-tag mb-0.5 text-fg-faint">Teaching point</p>
            <p className="text-[13px] leading-snug text-fg">{step.teachingPoint}</p>
          </div>
        </section>
      )}

      {step.guardrails.length > 0 && (
        <section>
          <p className="hud-tag mb-2 text-stop">Guardrails</p>
          <ul className="flex flex-col gap-1.5">
            {step.guardrails.map((g) => (
              <li key={g} className="flex gap-2 rounded-lg border border-stop/35 bg-stop/[0.07] px-3 py-2 text-[12.5px] leading-snug text-[#ffd2cc]">
                <OctagonAlert className="mt-0.5 size-3.5 shrink-0 text-stop" aria-hidden />
                {g}
              </li>
            ))}
          </ul>
        </section>
      )}

      {step.exceptions.length > 0 && (
        <section>
          <p className="hud-tag mb-2 text-amber">Exceptions</p>
          <ul className="flex flex-col gap-1.5">
            {step.exceptions.map((x) => (
              <li key={x} className="flex gap-2 rounded-lg border border-dashed border-amber/35 px-3 py-2 text-[12.5px] leading-snug text-fg-muted">
                <Split className="mt-0.5 size-3.5 shrink-0 text-amber" aria-hidden />
                {x}
              </li>
            ))}
          </ul>
        </section>
      )}

      {step.screenshotRef && (
        <button
          onClick={() => onEvidence(step)}
          className="focus-ring flex items-center justify-center gap-2 self-start rounded-lg border border-line-strong bg-raised px-3 py-2 text-xs font-medium text-fg transition hover:border-signal/50"
        >
          <ImageIcon className="size-3.5 text-signal" aria-hidden /> View screen evidence
        </button>
      )}
    </article>
  );
}
