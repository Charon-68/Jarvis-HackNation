# Frontend: working rules

The plan, art direction and roadmap are in `../docs/BLUEPRINT.md`. Missing facts are tracked in `../docs/CONTENT-TODO.md`.

## Hard rules
1. **Facts only from the repo's sources** (README, CONTEXT, fixtures, ticket data). All landing copy lives in `src/content/landing.ts`. An unknown is a typed `null` that renders nothing, plus a TODO ID.
2. **Don't touch product logic in a UI milestone:** `store/`, `adapters/` (except transport robustness), `capture/`, `evaluation`, tests.
3. **The browser is the truth.** Check every visual change at 1440, 1024 and 375 px. Check the console, and check that `scrollWidth <= innerWidth`.
4. **Motion has a reduced-motion path.** `?motion=reduced` forces it; `MotionConfig reducedMotion="user"` is used on the landing page.
5. **MotionSites templates** (`facet`, `mossline`, `shipcraft` zips) are **references only**. Re-implement the techniques; never paste their code or hot-link their CDN images or videos. The zips stay out of git.
6. **One accent, used with discipline.** Lime is for the Apprentice (orb, live and listening states, current stage, starting capture or a session). Console actions such as Save, Generate and Start training are neutral white (`bg-fg text-ink`). Emergency badges are outline-only.
7. **Colour roles.** `signal` (#C8F65A) means "the Apprentice is active". `stop` (#FF5D52) is only for guardrails and blocked actions. No new colours outside `@theme` in `src/styles/app.css`.

## Stack
- Vite 8, React 19, TS 7, Tailwind v4 (theme and utilities only; **no Preflight** yet), Motion 14, three 0.187, lucide-react.
- Fonts are self-hosted: Geist (UI), Geist Mono (IDs, timestamps, HUD tags), Instrument Serif (display text and expert quotes only).
- **Don't add:** GSAP, Lenis or other smooth-scroll libraries, React Router, R3F, other UI kits, WebXR. Reason: one animation library, native scroll, a small bundle.

## Architecture
- `src/lib/route.ts`: `/` is the landing page, `/app` is the console (History API). The build copies the shell to `dist/app/index.html`, so no host rewrite is needed.
- `src/App.tsx` is just a route switch. `src/console/ConsoleApp.tsx` (lazy) holds the session provider, screens, ElevenLabs `ConversationProvider` and the legacy prototype, so the landing page never loads the voice SDK.
- `src/lib/a11y.ts`: `rovingKeyDown` (radiogroups and tablists) and `trapTab` (dialogs). Use them for any new grouped control.
- `src/styles/app.css`: layers `theme → legacy (old index.css) → utilities`. The legacy CSS variables were remapped to the new palette, so the old screens restyle without code changes.
- `src/engine/ApprenticeCore.ts`: a framework-agnostic three.js scene, lazy chunk (~154 KB gz).
  - API: `setProgress(0..1)`, `launch()`, `setPaused()`, `dispose()`.
  - Tuned values live in `TUNING` and the formation builders. Note the reason when you change them.
  - Quality tiers: `high` (bloom, DPR ≤ 2) and `low`. `?quality=` overrides the tier.
  - Software GL throws, and `HeroScene` shows a CSS orb instead. `?webgl=off` forces this.
  - Handles context loss, pauses when the tab is hidden, and `launch()` resolves on a timer rather than rAF.
- `src/engine/coreShader.ts`: the signal-core shader shared by the landing scene and the console orb.
- `src/engine/OrbRenderer.ts` + `src/components/SignalOrb.tsx`: the agent's presence in the Apprentice/Tutor panel. States are `offline | connecting | listening | speaking | alert | error`, mapped from the voice adapter status by `orbStateFrom()`; `alert` is the tutor blocking a decision. It pauses when off-screen or in a hidden tab, has a CSS fallback, and its glow is a CSS halo (no bloom).
- `src/workmap/`: `WorkMapGraph` (React Flow 13, lazy chunk ~87 KB gz). The layout is computed from the WorkMap (wide: steps left→right with rules below; narrow < 768 px: steps top→bottom with rules to the right). `StepDetail` is shared by the inspector and the List view. Fit rules: fit all if zoom ≥ `MIN_READABLE_ZOOM` (0.72), otherwise start at step 1 and pan; narrow screens fit to width.
- `src/components/shell/`: `TopBar` (stage stepper derived from the session phase) and `Workspace` (panes side by side at ≥ 1024 px, tabs below; hidden panes stay mounted). Phase screens cross-fade via `AnimatePresence` in `App.tsx`.
- `src/landing/`: `HeroScene` (React wrapper) and `Landing` (the scroll document over a fixed stage; the pinned story maps scroll onto formations).

## QA switches
`/app?legacy=1` (old prototype toggle; console only) · `?webgl=off` · `?quality=low|high` · `?motion=reduced` · `?orb=listening|speaking|alert|…` (forces the panel orb state)

## Commands
`API_PROXY=https://jarvis-hacknation.onrender.com PORT=5174 npm run dev` runs the local UI against the deployed backend (the `frontend-live-api` launch config). The backend's CORS only allows the production origin, so a direct call from localhost would be refused.

`npm run dev` · `npm run typecheck` · `npm run build` · `npm test`. The launch config `frontend` is in `../.claude/launch.json`.

## Gotchas
- All API calls go through `apprenticeApi` (exported from `store/sessionStore`): real backend first, mock fallback with a console warning. Never call `mockApi` directly from a screen.
- `renderer.setSize(w, h, false)` doesn't set CSS size; the canvas style is forced to 100%.
- The legacy `index.css` `h3` style is uppercase and muted. Override it with `normal-case tracking-normal` in new UI.
- Without Preflight, buttons get UA styles; a minimal reset is in `app.css`.
- `lucide-react` 1.x has no brand icons (no `Github`).
- With Preflight off, lists show markers; `ol, ul { list-style: none }` is in the legacy-layer reset.
- QA for capture in the browser pane: `getDisplayMedia` is blocked there. To reach the recording states, stub it in the page console with a canvas `captureStream()` (inspection only; never in code).
- React Flow 13: dark mode is `forceColorMode="dark"` (not `colorMode`), and fitView `padding` must be a string such as `"56px"`; a bare 0.16 is read as pixels.
- `PriorityBadge` is the single source for priority colours: Emergency is `stop`, Moderate is `amber`, Low is neutral.
