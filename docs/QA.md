# QA record: UI refactor (branch `ui-refactoring`)

Date: 2026-11-21. Environment: the Claude desktop browser pane (Chromium, Apple M1 GPU) with the local Vite dev server and a plain static server on `dist/`.

## Build and tests
| Check | Result | How |
|---|---|---|
| Typecheck | Pass | `npm run typecheck` |
| Production build | Pass | `npm run build` (also emits `dist/app/index.html`) |
| Frontend test suites | Pass | `npm test` (all suites) |
| Python contract tests | **Not run** | pytest isn't installed in this environment. No backend files changed. |

## Bundle (gzip)
| Chunk | Size | Loaded when |
|---|---|---|
| index (React, router, styles) | 70 KB | always |
| shared Motion + icons | 50 KB | always |
| Landing | 5.5 KB | `/` |
| three.js + core shader | 145 KB | `/`, lazily after first paint; console orb on demand |
| ApprenticeCore / OrbRenderer | 9.7 / 1.6 KB | with three |
| ConsoleApp (session, screens, ElevenLabs SDK) | 196 KB | `/app` only |
| WorkMapGraph (React Flow) | 87 KB | the Work Map screen only |

The landing page's first-load JS went from about 306 KB to about 125 KB. The production build was checked in a browser: `/` never requests ConsoleApp, and `/app` never requests the landing scene.

## Routes and links
| Check | Result |
|---|---|
| `/` → landing; "Launch console" → `/app` (shatter transition) | Pass |
| Back and Forward between `/` and `/app` | Pass |
| `/app` refresh and deep link on a plain static server (no rewrites) | Pass: 301 to `/app/`, then 200 |
| Unknown path | Host 404 (static server). The SPA doesn't claim other routes. |
| `/app?legacy=1` shows the legacy toggle; the logo leaves it cleanly | Pass, after the review fix |
| Logo during a live session asks before leaving | Pass, after the review fix |

## Flows (local, mock API fallback)
| Flow | Result | Notes |
|---|---|---|
| Expert: launcher → capture → recording, pause, resume, stop → end task → debrief → teach-back → generate → Work Map | Pass | The pane blocks `getDisplayMedia`, so it was stubbed in the page console with a canvas `captureStream()` for QA. No code changes. |
| Work Map: graph select (click and Enter), List view, evidence dialog (focus in, Escape, focus back) | Pass | Evidence image showed "unavailable" because the stub stream is blank. |
| Training: wrong save → blocked moment → fix → save → results | Pass | The intervention scrolls into view: at 1440×900 the rule ends at y=862. |
| Real voice (ElevenLabs) | **Not verified** | The pane blocks the mic. Orb states were checked with `?orb=`. |
| Real backend on Render | **Not verified locally** | The timeout/fallback path was checked by reading the code. The live check happens after deploy. |

## Responsive (1440 / 1024 / 375)
Landing, launcher, capture, Work Map, debrief, training (including the blocked state) and results were all screenshotted at the three widths during M1–M6 and after the review fixes. `scrollWidth ≤ innerWidth` held at 375 on every screen checked.

## Accessibility
| Check | Result |
|---|---|
| Text contrast tokens (on ink #09090B) | fg 17.0, muted 7.1, faint 5.1, signal 15.9, stop 6.6, ink on signal 15.6 |
| Landing tab order (nav → hero CTAs → video → closing CTA → GitHub) with a visible focus ring | Pass |
| Radiogroup (launcher) and tablists (workspace, Work Map) support arrow keys, Home and End | Added after review |
| Evidence dialog: focus trap, Escape, focus return | Added after review |
| Focus moves to the new screen heading after a phase change, and to the first field after "Fix decision" | Added after review |
| Live regions: recording status label only (not the timer); tutor alert or voice error only (not listening/speaking flips) | Fixed after review |
| Reduced motion: OS setting or `?motion=reduced` (Motion `always`, CSS durations, 3D static frames, no flinch, no smooth scroll) | Pass |

## Fallbacks and QA switches
`?webgl=off` (CSS orbs, checked) · `?quality=low|high` (no-bloom tier, checked) · `?motion=reduced` (checked) · `?orb=<state>` (checked) · `/app?legacy=1` · software WebGL → CSS fallback (by code path). If the orb's GL context is lost it falls back to the CSS orb. Engines call `forceContextLoss()` on dispose.

## Independent reviews (M8)
- **Code review** (fresh subagent): no logic regressions. 15 findings; all fixed except the following, kept with reasons:
  - Fetch-timeout fallback logging (#10): existing behaviour, noted for the backend owner.
  - Back-button session loss: confirm is on the logo only; browser Back still unmounts the console.
- **Design review** (fresh subagent, 13 screenshots): fixed:
  - accent discipline (lime only for the Apprentice; neutral console actions);
  - outline Emergency badge and lime REC dot;
  - blocked-moment legibility and the intervention scrolled into view;
  - Work Map summary wrapping and mobile controls;
  - Debrief readability and P1 set in mono;
  - launcher orb;
  - landing guardrail tag and red guardrail shards;
  - bloom glare.

  Rejected:
  - hiding the React Flow attribution (licence request);
  - renaming `T_NEW_01` (repo data);
  - the duplicate mic message (dev-only StrictMode double mount).

## Known gaps
- Lighthouse/PageSpeed hasn't been run yet. Run it on the deployed URL (headless runs have no GPU and will under-report WebGL pages).
- OG image (1200×630) not created. Title, description and og:title/description are set.
- Team credit (C1) and other content TODOs: see `CONTENT-TODO.md`.
