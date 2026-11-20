/**
 * Small accessibility helpers shared by radio groups, tab lists and dialogs.
 */
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

/**
 * Arrow-key / Home / End navigation for a roving-tabindex group
 * (role="radiogroup" or role="tablist"). Selection follows focus.
 */
export function rovingKeyDown<T extends string>(
  e: ReactKeyboardEvent<HTMLElement>,
  ids: readonly T[],
  current: T,
  select: (id: T) => void,
) {
  const i = ids.indexOf(current);
  let next = -1;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % ids.length;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + ids.length) % ids.length;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = ids.length - 1;
  if (next < 0) return;
  e.preventDefault();
  select(ids[next]);
  const group = e.currentTarget;
  requestAnimationFrame(() => {
    group.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  });
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea,video[controls],[tabindex]:not([tabindex="-1"])';

/** Keep Tab / Shift+Tab inside `container` (modal dialogs). */
export function trapTab(e: KeyboardEvent, container: HTMLElement | null) {
  if (e.key !== "Tab" || !container) return;
  const items = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)];
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  } else if (!container.contains(document.activeElement)) {
    e.preventDefault();
    first.focus();
  }
}
