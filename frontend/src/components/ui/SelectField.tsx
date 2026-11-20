/** Labelled native select in the Signal style (keeps native a11y and mobile pickers). */
import { ChevronDown } from "lucide-react";

export default function SelectField({
  id,
  label,
  value,
  options,
  disabled,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  disabled?: boolean;
  /** Marks the field as part of a blocked decision. */
  invalid?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={`hud-tag ${invalid ? "text-stop" : "text-fg-faint"}`}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={`focus-ring w-full cursor-pointer appearance-none rounded-lg border bg-ink/60 py-2.5 pl-3 pr-9 text-[13.5px] font-medium text-fg transition disabled:cursor-not-allowed disabled:opacity-50 ${
            invalid ? "border-stop/60 bg-stop/[0.06]" : "border-line hover:border-line-strong focus:border-signal/60"
          }`}
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-faint" aria-hidden />
      </div>
    </div>
  );
}
