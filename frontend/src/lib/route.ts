/**
 * Minimal History API routing: "/" is the landing page, "/app" is the console.
 * Phases inside the console stay in the session state machine.
 * The host must rewrite unknown paths to /index.html (Render: Redirects/Rewrites).
 */
import { useSyncExternalStore } from "react";

export type Route = "landing" | "app";

const EVENT = "apprentice:navigate";

function readRoute(): Route {
  return window.location.pathname.replace(/\/+$/, "") === "/app" ? "app" : "landing";
}

function subscribe(cb: () => void) {
  window.addEventListener("popstate", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("popstate", cb);
    window.removeEventListener(EVENT, cb);
  };
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, readRoute, () => "landing");
}

export function navigate(to: Route) {
  if (readRoute() !== to) {
    const path = to === "app" ? "/app" : "/";
    // ?legacy is a console-only switch; don't carry it to the landing page.
    const params = new URLSearchParams(window.location.search);
    if (to === "landing") params.delete("legacy");
    const qs = params.toString();
    window.history.pushState({}, "", path + (qs ? `?${qs}` : ""));
  }
  window.dispatchEvent(new Event(EVENT));
}

/** QA / feature switches read from the URL, e.g. ?legacy=1, ?webgl=off, ?motion=reduced */
export function flag(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

export function prefersReducedMotion(): boolean {
  if (flag("motion") === "reduced") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
