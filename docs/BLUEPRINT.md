# AI Apprentice: UI Refactor Blueprint

Status: **Direction A approved, with 3D added.** M0 and M1 and the landing page (M7, brought forward) are done. See §11.
Date: 2026-11-21 · Branch: `ui-refactoring`

---

## 1. Resource table

| Source | Role | Key findings | Limits |
|---|---|---|---|
| Live site (jarvis-hacknation-frontend.onrender.com) | Current product | Home → Capture → Debrief → Work Map → Training, all in one dark indigo theme | **"Begin Expert Session" hangs on "Starting…"** for 20 s+. `HttpApprenticeApi.request` (`frontend/src/adapters/apprentice-api.ts:42`) has no timeout, so a cold Render backend blocks the mock fallback |
| GitHub repo (local checkout) | Code to keep and restyle | Vite + React 19 + TS, plain CSS tokens in `src/index.css`, 278 inline `style={{}}` blocks across screens and components, emoji icons, no router (phase state machine in `App.tsx`) | Ran it locally with mocks. Mic is blocked in the browser pane, so the live voice flow was not exercised |
| `workflow-kit.zip` | Process (same as the `website-build` skill) | Research → blueprint → approval gate → milestones with three-width screenshots → independent reviews → QA | The portfolio-specific techniques (3D engine, resume) mostly don't apply here |
| Research subagents (2) | Free templates, components, licences | See §3. Licences checked against LICENSE files where possible | Unverified items are flagged in §3 |

**Baseline measured locally:** `vite build` produces one 912 KB JS chunk (likely the ElevenLabs SDK, not split) and 8 KB of CSS. `package.json` pins every runtime dependency to `"latest"`, so builds are not reproducible.

## 2. Reference analysis

**What already works, and stays:**
- The Capture → Map → Teach state machine (`store/sessionStore.tsx`), adapters, evidence store, tests. No logic rewrite.
- The three-column capture console (ticket queue, active ticket, Apprentice panel and activity) is the right information architecture.
- The token set in `index.css` is a sound start; it needs re-tuning, not replacing.

**Weaknesses to fix (with evidence):**
1. **Generic look.** Indigo-to-violet gradient, 🎓/🎤/🎉 emoji as icons, centered card on a radial glow (`HomeScreen.tsx:27-50`). Reads as a default AI template.
2. **No product story.** The home screen is a form. Judges never see the Capture → Map → Teach idea, and `public/AI_Apprentice_Support_Triage_Demo.mp4` is only reachable via the legacy toggle.
3. **The agent has no visual presence.** The Apprentice is a text column; nothing shows it is listening or speaking.
4. **The Work Map is a list of cards**, though it's the product's core output (steps, guardrails, exceptions, evidence).
5. **Inline styles everywhere** (e.g. the same uppercase label style is repeated 12+ times in `TrainingWorkspace.tsx`), so a visual change touches every file.
6. **Dev leftovers in production:** the "Legacy Prototype" button is always visible (`App.tsx:362`); the hard-coded "Jane Expert" default name.
7. **Reliability:** the hang described above. The fix is a 4 s `AbortController` timeout before falling back to mocks.

## 3. Free resource shortlist

Only free and permissively licensed resources. Paid tiers are excluded.

| Resource | URL | What we'd use | Stack | Free? / licence | Fit | Decision |
|---|---|---|---|---|---|---|
| **ElevenLabs UI** | ui.elevenlabs.io · github.com/elevenlabs/ui | `orb` (agent presence), `live-waveform`, `bar-visualizer`, `conversation`, `transcript-viewer`, `voice-button`, `shimmering-text` | shadcn registry, Tailwind v4, React 19. Orb uses three / R3F | Free, **MIT** (verified) | Built for `@elevenlabs/react`, which we already use; matches the sponsor | **Reuse.** Lazy-load the Orb (three.js is ~150 KB+ gz) and use a CSS fallback |
| **shadcn/ui** | ui.shadcn.com | Dialog (evidence replay), Tabs, Tooltip, Sheet (mobile panels), Sonner toasts, Resizable panels | Copy-in source, Tailwind v4, Radix | Free, MIT | Required by ElevenLabs UI | **Reuse**, only the components we need |
| **Motion** (core) | motion.dev | Phase transitions, `AnimatePresence`, layout animations, staggered reveals | Works with plain CSS too | Core MIT. Motion+ (~$399) **not used** | Same library as the portfolio | **Reuse** as the only animation library |
| **React Flow** (`@xyflow/react`) + dagre | reactflow.dev | Work Map as a graph: step nodes, guardrail "stop" nodes, evidence links, minimap | Ships its own CSS | MIT. Pro subscription not needed; keep the attribution badge | Steps are linear today, but guardrails and exceptions branch off them | **Reuse**, lazy-loaded, keeping the list view as the accessible fallback |
| Lucide icons | lucide.dev | Replace every emoji | React | ISC | Default in shadcn and ElevenLabs UI | **Reuse** |
| Geist, Geist Mono (+ Instrument Serif) | Google Fonts / @fontsource | UI, ticket IDs and timestamps; serif for display only | Self-hosted | OFL 1.1 (Geist verified) | Replaces Inter | **Reuse** |
| Magic UI (free components only) | magicui.design | `border-beam` on the active ticket; `animated-beam` for Capture→Map→Teach on the landing page | Tailwind + motion | MIT. Pro templates ($199) **not used** | Optional accent | **Adapt** at most 2 components |
| AutoAnimate | auto-animate.formkit.com | Event timeline insertions | Plain | MIT, ~3 KB | Cheap win | **Reuse** |
| satnaing/shadcn-admin | github.com/satnaing/shadcn-admin | App-shell patterns: collapsible sidebar, command palette, header | **Vite** + shadcn | MIT (verified) | Closest repo to our stack | **Adapt** patterns, don't fork |
| LiveKit agent-starter-react | github.com/livekit-examples/agent-starter-react | Voice-session layout: agent tile, transcript, control bar, connect states | Next.js + shadcn | MIT (verified) | Pattern for Training | **Recreate** the layout ideas |
| Vercel workflow-builder-template | github.com/vercel-labs/workflow-builder-template | Node styling and inspector panel for React Flow | Next.js + xyflow | Apache-2.0 (verified) | Pattern for the Work Map | **Recreate** ideas |
| React Bits / OGL | reactbits.dev · github.com/oframe/ogl | One subtle hero background (e.g. Threads or Silk), if CSS isn't enough | OGL | React Bits is **MIT + Commons Clause** (use is fine, resale isn't); OGL is Unlicense | Only if a CSS gradient falls short | **Optional**, one effect max |

**Rejected:**
- **motionsites.ai:** paid prompt library; its terms forbid redistributing the prompts and keep rights to its video backgrounds. Inspiration only.
- **Aceternity UI:** custom licence, unclear whether it covers the free items.
- **Cruip:** GPL wording and no LICENSE file.
- **HTML5 UP:** dated, and CC BY requires credit.
- **Shadertoy:** CC BY-NC-SA by default.
- **GSAP:** free incl. plugins, but Motion covers our needs; shipping both adds weight with no gain.
- **Animate UI, Motion Primitives, HyperUI:** overlap with shadcn + Motion.

**Design references (principles only, nothing copied):**
- **elevenlabs.io:** near-monochrome palette, serif + sans pairing, orb as the agent's presence, product demo in the hero.
- **linear.app:** dense dark UI, a timeline/changelog rhythm for our event stream, staggered reveals.
- **vercel.com:** mono labels and a pipeline visual (Capture → Map → Teach as three stages).
- **raycast.com:** keyboard chips and a command palette for console actions.
- **granola.ai:** "transcript becomes structured notes", which is exactly our Capture → Work Map moment.
- **hume.ai:** voice visualizer as the brand centrepiece, with status chips on a live transcript.

## 4. Reuse / adapt / redesign / remove

| Item | Action |
|---|---|
| `sessionStore`, adapters, capture pipeline, evidence store, tests, types | **Keep unchanged** |
| Screen and component JSX structure | **Adapt:** keep the props and logic, move inline styles to tokens and classes, swap in primitives |
| `index.css` tokens | **Redesign:** new palette and type scale, mapped into Tailwind `@theme` |
| Home screen | **Redesign** as a landing page plus a session launcher |
| Work Map | **Redesign:** graph view plus the existing list as fallback |
| Apprentice panel / tutor | **Adapt:** add the Orb/waveform driven by the existing conversation status |
| Legacy prototype toggle | **Remove from production UI** (keep it behind `?legacy=1`) |
| `"latest"` dependency pins | **Replace** with exact versions |

## 5. Art directions

### A. "Signal Room" (recommended)
- **Concept:** a calm, precise operations console where the Apprentice is a living signal. Monochrome by default, one accent that means "the Apprentice is paying attention".
- **First impression:** a near-black hero with a large Orb that reacts on hover. The headline is set in Instrument Serif, with the three stages Capture, Map, Teach drawn as a beam passing through them, and the demo video framed as product UI below.
- **Palette:**

  | Role | Hex |
  |---|---|
  | Background | `#09090B` |
  | Surface | `#111113` |
  | Raised | `#18181B` |
  | Line | `rgba(255,255,255,.08)` |
  | Text | `#EDEDEF` |
  | Muted | `#8B8B94` |
  | Accent ("signal") | `#C8F65A` |
  | Guardrail / stop | `#FF5D52` |
  | P2 | `#F5B544` |
  | Verified | `#3DDC97` |

- **Type:**
  - Geist for the UI (13 / 14 / 16 / 20 / 28 px; fluid 40 to 72 px on the landing page).
  - Geist Mono for ticket IDs, timestamps and event codes.
  - Instrument Serif for landing headlines and expert quotes only.
- **Layout:**
  - Landing: a 12-column grid at a max of 1200 px.
  - App: the existing three-pane console made resizable, with 1 px hairlines instead of boxed cards. Panes collapse to tabs below 1024 px.
- **Navigation:**
  - A slim top bar with a stage stepper (Capture → Debrief → Map → Teach) that shows progress, replacing the uppercase phase badge.
  - ⌘K for actions.
- **Content:** expert answers render as margin notes ("why" annotations) beside the step they explain; guardrails render as red stop-plates.
- **Motion:**
  - Stage transitions slide and fade at 250–400 ms.
  - The Orb reacts to listening and speaking.
  - Timeline items enter with AutoAnimate.
  - All motion has a reduced-motion path.
- **Risk:** the lime accent is bold. It has to stay rare (state only, never decoration), or it turns into neon.

### B. "Field Notebook"
- **Concept:** apprenticeship as a craft. A warm, light, editorial interface; the Work Map is an annotated notebook page.
- **Palette:**

  | Role | Hex |
  |---|---|
  | Paper | `#F4F1EA` |
  | Ink | `#1B1A17` |
  | Pencil | `#6E6A60` |
  | Rule lines | `#D9D3C4` |
  | Accent (marker blue) | `#2546F0` |
  | Stop | `#D7362B` |

- **Type:** Instrument Serif and Geist, with handwritten-feeling underlines.
- **Strength:** the most distinctive option, and it suits "teaching".
- **Risk:** a light theme is harder to make feel "live AI"; dense console screens look busy on paper tones; it's a bigger departure from the current dark product.

### C. "Glass Lab"
- **Concept:** immersive. A full-screen WebGL aurora behind glass panels, a 3D Orb, scroll-driven landing choreography.
- **Palette:** deep navy `#060816`, glass `rgba(255,255,255,.06)`, cyan `#5CE1FF`, magenta `#C86BFA`.
- **Strength:** the biggest "wow" in a demo video.
- **Risk:** this is the generic AI aesthetic the quality bar rejects. It also adds GPU cost during screen-share capture (which the app itself performs), and text contrast over a moving background is hard.

**Recommendation: A**, taking B's serif quotes and margin-note treatment for expert reasoning. Reasons:
- The audience is hackathon judges and ElevenLabs. A focused console that makes the agent visibly present and the Work Map tangible shows the product's value fastest.
- It stays dark (continuity, and comfortable on projectors).
- It reuses the sponsor's own MIT components.

## 6. Information architecture

| View | Purpose | Notes |
|---|---|---|
| `/` Landing (new) | Explain Capture → Map → Teach in about 10 s, show the demo video, start a session | Copy only from the README; team and hackathon facts are TODOs |
| Launcher | Mode choice (Expert / Trainee) plus name | Keeps the current Home logic |
| Capture console | Ticket queue · active ticket · Apprentice (Orb, questions, activity) | Same panes, restyled |
| Debrief | Spoken teach-back with a live transcript | `transcript-viewer` and waveform |
| Work Map | Graph plus list toggle; evidence replay in a Dialog | React Flow, lazy-loaded |
| Training | Ticket · decision form · Tutor (Orb) · blocked-save state | The "blocked" moment gets a deliberate, unmissable treatment |
| Results | Score, what was blocked and why, back to start | Replaces the 🎉 screen |

**Routing:** add a ~40-line History API layer so `/` (landing) and `/app` (console) are separate URLs. Phases inside `/app` stay in the state machine; no React Router.

## 7. Technical architecture

- **Add:**
  - Tailwind v4 (`@tailwindcss/vite`) with the existing CSS variables mapped into `@theme`. Preflight is enabled only once every screen has migrated, one screen at a time.
  - shadcn (only the components we use) and ElevenLabs UI components.
  - `motion`, `lucide-react`, `@xyflow/react` + `dagre`, `@formkit/auto-animate`.
  - `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`, `@fontsource/instrument-serif`.
  - A `@/` path alias.
- **Deliberately not adding:**
  - GSAP or Lenis: Motion is enough, and native scroll is better for a console.
  - React Router: two URLs don't need it.
  - A UI kit beyond shadcn.
  - Aceternity.
  - A WebGL background (unless direction C is chosen).
- **Structure:**
  - `src/components/ui/` (shadcn and ElevenLabs primitives)
  - `src/components/app/` (existing domain components)
  - `src/screens/`
  - `src/landing/`
  - `src/styles/tokens.css`
  - `src/content/landing.ts` (all landing copy, typed)
- **Performance budget:** landing JS ≤ 250 KB gz on first load. The ElevenLabs SDK, three.js (Orb) and React Flow are split into lazy chunks loaded when the console opens.
- **Accessibility:** WCAG AA contrast computed for every text token; visible focus; keyboard path through the queue, form and dialogs; reduced motion; the Orb has a text status equivalent.
- **SEO and sharing:** per-route title, description and OG image (1200×630) for `/`.
- **Deploy:** unchanged (Render static site). Add the SPA rewrite for `/app`.

## 8. Missing information (CONTENT-TODO)

| ID | What | Used in | Until supplied | Blocks launch? |
|---|---|---|---|---|
| C1 | Team name and members to credit | Landing footer | Hidden | No |
| C2 | Hackathon result or track wording you're happy to publish | Landing hero eyebrow | "ElevenLabs × Hack-Nation" only (from README) | No |
| C3 | Is the demo MP4 OK to show publicly on the landing page? | Landing demo | Not shown | Yes, for the demo section |
| C4 | Repo / devpost / video links | Landing CTAs | GitHub link only | No |
| C5 | Logo or wordmark preference | Top bar, favicon | Typographic wordmark | No |
| C6 | Keep the legacy prototype reachable at all? | `?legacy=1` | Kept, hidden | No |

## 9. Roadmap (one commit and a report per milestone; you say "next")

| M | Scope | Done when |
|---|---|---|
| M0 | Foundation: pin dependencies, `@/` alias, Tailwind v4 (no preflight), fetch timeout fix, hide the legacy toggle, `CLAUDE.md`, `docs/` | Builds clean; behaviour identical; live hang fixed |
| M1 | Design system: tokens, fonts, Lucide, Button/Badge/Card/Field/Stepper, contrast table, dev specimen page | Specimen reviewed at 1440 / 1024 / 375 |
| M2 | App shell: top bar and stage stepper, resizable panes, mobile tabs, phase transitions | Every phase reachable and screenshotted |
| M3 | Agent presence: ElevenLabs Orb (lazy) and waveform in the Apprentice panel and Tutor, with a CSS fallback | Orb states driven by real conversation status; fallback verified |
| M4 | Capture console restyle: queue, active ticket, activity timeline (AutoAnimate), margin-note answers | 3 widths verified |
| M5 | Work Map: React Flow graph and list toggle, guardrail plates, evidence Dialog | Graph renders the mock map; keyboard-accessible list fallback |
| M6 | Debrief, Training, blocked-save moment, Results | Blocked-save state is unmissable; 3 widths |
| M7 | Landing page plus `/` and `/app` URLs, OG meta | Landing reads correctly without the TODO facts |
| M8 | Code-review and design-review subagents; QA (keyboard, reduced motion, bundle split, Lighthouse); deploy | `docs/QA.md` complete; live URL verified |

## 10. Decisions needed

1. **Direction:** A "Signal Room" (recommended), B, or C. Elements can be mixed.
2. **Tailwind v4 + shadcn:** adopt them (recommended; ElevenLabs UI depends on them), or stay on plain CSS and hand-port the components (slower, more drift).
3. **Work Map as a graph (React Flow):** yes (recommended), or keep an improved vertical list only.
4. **Landing page:** add it at `/` (recommended), or keep the app-only launcher.
5. Answers for C1–C6 when convenient. None of them block M0–M6.

---

## 11. Update (2026-11-21): 3D direction and MotionSites templates

**What was asked for:** "crazy-looking" 3D and advanced graphics, plus the three MotionSites templates (Facet, Mossline, Shipcraft) integrated wherever they fit naturally.

**Template analysis.** All three are single-file HTML/three.js pages generated by AI Studio. They load three.js from a CDN and include a Gemini/Express server.

| Template | What's strong | Where it fits | Taken | Left out |
|---|---|---|---|---|
| **Facet** (smoked glass) | Iridescent smoked-glass physical material, a pointer-glow shader patch, bloom tuned so only rims glow, shatter physics | Landing hero, and the launch transition | Glass shards, pointer glow, rim-only bloom, the shatter becoming "Launch console" | Paper view, XR and stereo, control dock |
| **Mossline** (planet telemetry) | A pinned scroll story, HUD telemetry tags pinned to 3D objects, mono labels, lime accent | The Capture → Map → Teach story | Pinned story, shard-anchored HUD tags, mono label style | All CDN photos and video (MotionSites-owned), rock physics, XR |
| **Shipcraft** (amber studio) | Floating instanced motes, thin rings, damped pointer lighting, closing CTA with an oversized wordmark footer | Ambient layer and closing section | Motes, rings, `damp()`-based motion, closing CTA, outline wordmark | Marble-hand images, amber palette, XR, newsletter |

**Licence.** MotionSites' terms allow building sites with the templates but forbid redistributing their code or assets. The techniques were re-implemented in `src/engine/ApprenticeCore.ts`; no template code or media is in the repo, and the zips are git-ignored.

**Story the 3D tells.** One scene, four formations driven by scroll:
- **Orbit (hero):** glass shards circle a living signal core, the Apprentice.
- **Capture:** shards spread out like observed screen fragments, tagged `T001 · Scope · all customers → P1`, `T003 · Potential data loss`, `Guardrail · Stop + escalate`.
- **Map:** shards lock into a connected graph; guardrail nodes glow red.
- **Teach:** everything condenses into one crystal around the core.

**Next milestones (revised):**
- **M2:** app shell, with a stage stepper and glass panes.
- **M3:** agent presence. A small WebGL signal orb (sharing the engine's core shader) in the Apprentice panel and the Tutor, reacting to listening and speaking.
- **M4:** capture console restyle.
- **M5:** Work Map as a graph (React Flow), reusing the shard and guardrail visual language.
- **M6:** Training and the blocked-save moment.
- **M8:** reviews, QA and deploy. This includes lazy-loading the console bundle: the ElevenLabs SDK is still in the main chunk at 248 KB gz.
