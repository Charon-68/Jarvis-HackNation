# AI Apprentice — WORKTODO: Person 1

**Role:** Frontend / Product / Workflow UI

**Owns:** Everything visible and interactive in the product. Person 1 must build the complete Capture → Map → Teach experience using mocks first, then replace mocks with Person 2/3 adapters.

**Does not own:** Claude calls, Work Map generation logic, ElevenLabs agent configuration/prompting, backend database schema, provider secrets.

---

## 0. Read Before Coding

Read:

```text
README.md
CONTEXT.md
ARCHITECTURE.md
WORKFLOW.md
INTEGRATION.md
shared/types.ts
shared/demo-tickets.*
```

Do not change shared contracts without team agreement.

---

# 1. Repository / Frontend Structure

Create and own the frontend area. Recommended structure:

```text
frontend/
├── app/
├── components/
├── features/
│   ├── support-triage/
│   ├── expert-capture/
│   ├── work-map/
│   └── training/
├── adapters/
│   ├── apprentice-api.ts
│   └── voice-agent.ts
├── capture/
│   └── screen-capture.ts
└── mocks/
    ├── mock-apprentice-api.ts
    └── mock-voice-agent.ts
```

Exact framework folder names can differ, but the ownership boundary must remain the same.

---

# 2. Task P1-01 — Main Web App Shell

Build the application shell and navigation.

Required product states:

```text
Home / Start
   ↓
Expert Capture
   ↓
Debrief / Map Ready
   ↓
Work Map
   ↓
New Hire Training
   ↓
Training Results
```

Requirements:

- clear session state;
- clear Capture / Map / Teach navigation;
- persistent AI Apprentice side panel area;
- no provider-specific implementation in page components;
- responsive enough for the hackathon demo.

**Done when:** the entire product can be clicked through with mock data without any AI service.

---

# 3. Task P1-02 — Support Triage Demo Application

Implement the controlled fake support workflow from `WORKFLOW.md`.

UI must contain:

- ticket queue;
- active ticket;
- customer/problem/scope information;
- Priority selector;
- Team selector;
- Action selector;
- Save button;
- current decision state;
- decision/save status.

Canonical ticket set:

```text
T001 — production website down for all customers
T002 — one employee cannot log in
T003 — customer data disappeared after update
T004 — password reset
T005 — API errors for many customers
T006 — dashboard slow for several customers
```

The exact values and intended decisions must come from `shared/demo-tickets.*` / `WORKFLOW.md`.

**Important:** Do not visibly hard-code hidden expert reasoning into the UI. The trainee should encounter the case naturally.

**Done when:** the user can reproduce the canonical expert sequence T001 → T002 → T003 → T005 → T006 and make the required decisions.

---

# 4. Task P1-03 — Demo Dataset Loader

Load the shared ticket fixtures rather than duplicating ticket definitions inside components.

Create a single workflow-data access layer, e.g.:

```ts
getTicket(ticketId): Ticket
listTickets(): Ticket[]
getTrainingCase(): TicketLikeCase
```

**Done when:** changing demo fixture values does not require editing React components.

---

# 5. Task P1-04 — Expert Capture Workspace

Build the exact expert working layout:

```text
┌──────────────┬───────────────────────────┬─────────────────────┐
│ Ticket Queue │ Active Ticket             │ AI Apprentice       │
│              │ Priority                 │ Voice / transcript  │
│ T001         │ Team                     │ Agent status        │
│ T002         │ Action                   │ Questions/answers   │
│ ...          │ Save                     │                     │
└──────────────┴───────────────────────────┴─────────────────────┘
│ Capture status / Pause / Resume / Stop                        │
└───────────────────────────────────────────────────────────────┘
```

Build visual states for:

- ready;
- capturing;
- paused/off-record;
- debrief;
- map ready.

**Done when:** the golden demo can be performed in the UI using mocks.

---

# 6. Task P1-05 — Browser Screen Sharing

Implement `getDisplayMedia`-based capture lifecycle behind:

```ts
interface ScreenCaptureController {
  start(): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  getStatus(): CaptureStatus;
  onFrame(callback: (frame: Blob | ImageBitmap) => void): () => void;
  onStatusChange(callback: (status: CaptureState) => void): () => void;
}
```

Handle:

- permission rejection;
- user cancellation;
- browser stream ending unexpectedly;
- explicit stop;
- pause/resume;
- session end.

Do not call Claude directly from this layer.

**Done when:** screen sharing can start/stop/pause/resume cleanly and produces frames for the `onFrame` callback.

---

# 7. Task P1-06 — Frame Sampling / Handoff

Own the browser-side side of the frame pipeline:

```text
ScreenCaptureController
        ↓
frame sampler
        ↓
VisionAdapter.analyzeFrame(...)
```

Do not decide Claude request/response structure.

For the MVP, sample only enough frames to detect meaningful workflow changes; do not stream the whole screen continuously.

**Done when:** Person 3 can plug in `VisionAdapter` without changing the capture UI.

---

# 8. Task P1-07 — ElevenLabs Side-Panel Integration Surface

Build a provider-neutral side-panel component.

The component should consume:

```text
agent status
AgentMessage[]
question state
intervention state
```

It must not know ElevenLabs internal message formats.

The provider-specific adapter comes from Person 2.

**Done when:** the panel renders with `MockVoiceAgent` and later can accept the real adapter without a component rewrite.

---

# 9. Task P1-08 — Voice Adapter Integration Hook

Consume Person 2's implementation through the shared interface only:

```ts
VoiceAgentAdapter
```

Person 1 should provide the host lifecycle:

```text
start session
→ connect interviewer
→ update context
→ receive AgentMessage
→ disconnect
```

Do not register ElevenLabs tools or configure agent prompts inside page components.

---

# 10. Task P1-09 — ScreenEvent UI Consumer

When Person 3 returns `ScreenEvent[]`, display a concise event timeline / activity state.

Examples:

```text
T003 opened
Priority changed → P1
Team changed → Engineering
Action changed → STOP + escalate
```

Do not expose raw Claude output.

**Done when:** a `ScreenEvent` fixture appears correctly in the UI and can be associated with an agent question.

---

# 11. Task P1-10 — Session Controls

Implement:

- Start Session;
- Pause / Off Record;
- Resume;
- Stop Capture;
- End Expert Task;
- Start Training Session;
- session phase indicators;
- error/retry UI.

While paused:

- stop frame processing;
- stop new capture-derived events;
- show visible paused state;
- preserve current session.

---

# 12. Task P1-11 — Debrief / Map Transition UI

After expert capture ends:

```text
Capture finished
    ↓
Debrief state
    ↓
Work Map generation state
    ↓
Map ready
```

Render:

- debrief progress/status;
- whether teach-back is complete;
- map-generation loading/error;
- retry if generation fails.

The conversational debrief itself is Person 2's responsibility.

---

# 13. Task P1-12 — Work Map Viewer

Render the canonical `WorkMap`.

Every important step should show:

- step number;
- observed action;
- decision;
- expert reasoning;
- guardrail;
- exception where available;
- teaching point;
- evidence availability.

Use the shared `WorkMap` object directly.

**Done when:** the canonical six-step Work Map renders without relying on hard-coded UI rows.

---

# 14. Task P1-13 — Clickable Expert Evidence Replay

When a Work Map step contains `screenshotRef`, allow the user to:

```text
click Work Map step
      ↓
open evidence
```

Support a mock/local evidence provider first.

The UI must not care whether evidence later comes from a file, object store, URL, or generated artifact.

---

# 15. Task P1-14 — New-Hire Training Workspace

Create a separate training interface.

Show:

- unseen case;
- Priority selector;
- Team selector;
- Action selector;
- Save button;
- tutor/voice area;
- reasoning/intervention state.

Canonical unseen case:

> 12 customers lost transaction history after an update.

Canonical initial mistake:

```text
P3 / Support / Normal troubleshooting
```

Do not display the correct answer before the trainee attempts the case.

---

# 16. Task P1-15 — Pre-Save Evaluation Gate

Save must follow this sequence:

```text
click Save
   ↓
freeze attempted decision
   ↓
ApprenticeApi.evaluateDecision()
   ↓
allowSave?
  /       \
YES       NO
 ↓          ↓
commit    show intervention
```

The frontend must never commit an unsafe decision merely because a voice response is delayed.

**Done when:** the canonical P3 trainee attempt is blocked before persistence.

---

# 17. Task P1-16 — Tutor Intervention UI

Render the shared `TutorIntervention` object.

For the critical case, show:

```text
CHECK THIS DECISION

This case may involve data loss.

Expert rule:
Possible data loss → STOP + escalate.

[Replay expert moment] [Fix decision]
```

The UI reason must come from the intervention contract, not from a second frontend rule engine.

---

# 18. Task P1-17 — Training Result Screen

Show final result using application-level result data.

At minimum include:

- whether the trainee initially made an error;
- whether an intervention occurred;
- whether the trainee corrected it;
- final decision;
- key learned rule;
- evidence link where available.

A simple success state is enough for MVP.

---

# 19. Task P1-18 — Mock Integration Layer

Create and maintain:

```text
MockApprenticeApi
MockVoiceAgent
MockScreenEventProvider
MockWorkMapProvider
MockDecisionEvaluator
```

The mocks must implement the same contracts as live services.

The UI must be fully demoable with mocks.

---

# 20. Task P1-19 — Error / Loading / Empty States

Implement user-safe states for:

- voice unavailable;
- vision unavailable;
- Work Map generation failed;
- evaluator unavailable;
- capture permission denied;
- tool failure;
- empty Work Map;
- missing evidence.

Do not show raw stack traces in product UI.

---

# 21. Task P1-20 — Integration Tests

Test at least:

- expert session starts;
- screen capture state transitions;
- ticket changes generate workflow state;
- ScreenEvent appears in UI;
- agent status appears;
- debrief state appears;
- Work Map renders;
- evidence click works;
- trainee incorrect save is blocked;
- intervention renders;
- corrected decision saves;
- pause stops new capture events.

---

# 22. Exact Interfaces Person 1 Must Deliver

```ts
ScreenCaptureController
ApprenticeApi
VoiceAgentAdapter // consumed, not implemented with ElevenLabs internals
```

Frontend components should treat these as black boxes.

---

# 23. Files Person 1 Should Own

Primarily:

```text
frontend/
ui/
app routes/
capture/
adapters/apprentice-api.ts
adapters/voice-agent.ts
mocks/
```

Avoid editing:

```text
agents/
backend/
vision/
workmap/
privacy/
storage/
```

Shared files are read-only by default.

---

# 24. Person 1 Final Acceptance Test

The frontend is done when, using mocks, a tester can:

```text
Start Expert Session
→ Share Screen
→ Open T001/T002/T003/T005/T006
→ Change decisions
→ See Apprentice panel
→ See semantic event timeline
→ Finish capture
→ Enter debrief state
→ Open Work Map
→ Click an evidence step
→ Start Training
→ Open unseen case
→ Choose P3/Support/Normal troubleshooting
→ Click Save
→ Save is blocked
→ Intervention appears
→ Replay expert evidence
→ Correct decision
→ Save succeeds
→ Training result appears
```

Then replace mocks one integration at a time.
