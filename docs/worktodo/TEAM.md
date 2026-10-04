# AI Apprentice — Three-Person Implementation Plan

This document is the master allocation. Each person works independently on a device/repo, but all three implementations must conform to the five shared project files and `shared/types.ts`.

## Ownership at a glance

| Area | Person 1 | Person 2 | Person 3 |
|---|---|---|---|
| Product/UI | **OWNER** | — | — |
| Support Triage workflow UI | **OWNER** | — | — |
| Browser screen capture | **OWNER** | — | — |
| ElevenLabs provider | — | **OWNER** | — |
| Interviewer/debrief/tutor | — | **OWNER** | — |
| Claude Vision | — | — | **OWNER** |
| ScreenEvent generation | — | — | **OWNER** |
| Work Map synthesis | — | — | **OWNER** |
| Deterministic Save/Block | — | — | **OWNER** |
| Storage/API | — | — | **OWNER** |
| Work Map UI | **OWNER** | consumes | produces |
| Tutor intervention UI | **OWNER** | voice | evaluator |
| ScreenEvent → agent context | host/consumer | **OWNER** | producer |
| ExpertAnswer | consumer | **OWNER** | storage |
| Training result UI | **OWNER** | conversation metrics | **OWNER** backend data |

---

# 1. The Most Important Integration Rule

The three people should NOT integrate by directly importing each other's internal code.

Use:

```text
Person 1 UI
   ↕
shared contracts / HTTP APIs / adapters
   ↕
Person 2 ElevenLabs
Person 3 Vision + Backend
```

The canonical shared objects are:

```text
Session
ScreenEvent
ExpertAnswer
WorkMapStep
WorkMap
DecisionAttempt
TutorIntervention
CaptureState
AgentMessage
```

---

# 2. Recommended Final Repository Shape

Even when development happens in separate repos, the final integrated repository should resemble:

```text
ai-apprentice/
├── frontend/        # Person 1
├── agents/          # Person 2
├── backend/         # Person 3
├── vision/          # Person 3
├── shared/          # canonical contracts + fixtures
├── fixtures/        # golden integration fixtures
├── README.md
├── CONTEXT.md
├── ARCHITECTURE.md
├── WORKFLOW.md
└── INTEGRATION.md
```

When possible, keep each person's owned implementation under their directory so final merging is mostly directory-level rather than file-level conflict resolution.

---

# 3. Shared Files Must Be Frozen First

These are the shared source-of-truth files:

```text
README.md
CONTEXT.md
ARCHITECTURE.md
WORKFLOW.md
INTEGRATION.md
shared/types.ts
shared/demo-tickets.*
```

Normal rule:

> Read these files; do not casually edit them from three branches.

If a contract must change:

```text
1. announce change
2. update shared/types.ts
3. update INTEGRATION.md
4. update fixtures
5. update affected adapters
6. run integration test
7. only then continue feature work
```

---

# 4. Integration Contracts Between People

## Person 1 ↔ Person 3

HTTP/API boundary:

```text
POST /api/sessions
POST /api/screen-events
POST /api/expert-answers
POST /api/sessions/:sessionId/end
POST /api/work-maps/generate
GET  /api/work-maps/:workMapId
POST /api/training/decision-attempt
```

Person 1 sends:

```text
session metadata
ScreenEvents / workflow actions
ExpertAnswers when appropriate
DecisionAttempt
```

Person 3 sends:

```text
Session
ScreenEvents
WorkMap
TutorIntervention
allowSave
training result
```

Person 1 must not call Claude directly.

---

## Person 1 ↔ Person 2

Provider adapter boundary:

```ts
VoiceAgentAdapter
```

Person 1 supplies:

```text
session ID
current ticket context
current workflow state
ScreenEvent context
WorkMap context
TutorIntervention
frontend client-tool handlers
```

Person 2 supplies:

```text
AgentMessage
ExpertAnswer
agent status
voice connection
```

Person 1 must not depend on ElevenLabs internal message formats.

---

## Person 2 ↔ Person 3

Person 2 consumes:

```text
ScreenEvents
workflow/ticket context
WorkMap
TutorIntervention/evaluation context
```

Person 2 produces:

```text
ExpertAnswers
teach-back confirmation/correction
conversation-analysis fields
```

Person 3 remains the application persistence/source-of-truth layer.

---

# 5. Integration Order

Do not wait until the end to discover interface problems.

### Step 1 — Shared fixtures

All three implement their first version against deterministic fixtures.

### Step 2 — Person 1 UI

Person 1 makes the entire Capture → Map → Teach experience clickable with mocks.

### Step 3 — Person 2 voice

Person 2 plugs real ElevenLabs into the `VoiceAgentAdapter`.

### Step 4 — Person 3 vision

Person 3 plugs Claude Vision into the frame/event path.

### Step 5 — Context bridge

Connect:

```text
ScreenEvent
   ↓
Person 2 Dynamic Variables / Tools
   ↓
ElevenAgents
```

### Step 6 — Work Map

Connect:

```text
ScreenEvents + ExpertAnswers + teach-back
   ↓
Person 3
   ↓
WorkMap
   ↓
Person 1 UI + Person 2 tutor
```

### Step 7 — Training

Connect:

```text
trainee decision
   ↓
Person 3 evaluator
   ↓
TutorIntervention
   ├── Person 1 UI
   └── Person 2 voice
```

### Step 8 — End-to-end hardening

Pause/off-record, retries, errors, privacy, evidence replay, demo polish.

---

# 6. Golden End-to-End Test

This exact flow should work after final integration:

```text
START EXPERT SESSION
       ↓
SHARE SCREEN
       ↓
T001 / T002 / T003 / T005 / T006
       ↓
SCREEN EVENTS ARRIVE
       ↓
ELEVENLABS RECEIVES CONTEXT
       ↓
≥3 LIVE QUESTIONS
       ↓
EXPERT ANSWERS ASSOCIATED WITH EVENTS
       ↓
END TASK
       ↓
≥3 NEW DEBRIEF FOLLOW-UPS
       ↓
TEACH-BACK
       ↓
EXPERT CONFIRMS / CORRECTS
       ↓
WORK MAP GENERATED
       ↓
WORK MAP SHOWN + CLICKABLE EVIDENCE
       ↓
NEW TRAINING SESSION
       ↓
UNSEEN DATA-LOSS CASE
       ↓
TRAINEE CHOOSES P3 / SUPPORT / NORMAL TROUBLESHOOTING
       ↓
EVALUATOR = WRONG
       ↓
allowSave = false
       ↓
TUTORINTERVENTION
       ├── UI intervention
       └── VOICE intervention
       ↓
EXPERT EVIDENCE REPLAY
       ↓
TRAINEE CORRECTS
       ↓
SAVE ALLOWED
       ↓
TRAINING RESULT
```

---

# 7. Merge Rules for Three Separate Repos

Each person should make their repo exportable as a self-contained owned module.

### Person 1 repo

Final transferable area:

```text
frontend/
capture/
frontend adapters/
mocks/
```

### Person 2 repo

Final transferable area:

```text
agents/
elevenlabs adapter/
tool definitions/
flow configuration/
analysis/
```

### Person 3 repo

Final transferable area:

```text
backend/
vision/
workmap/
evaluation/
storage/
privacy/
fixtures/
```

Do not make a developer's implementation depend on an arbitrary local filesystem path from another repo.

Use environment variables for service URLs/IDs.

---

# 8. Branch / Commit Protocol

Use one branch per person in the final integration repo if possible:

```text
main
person1/frontend
person2/elevenlabs
person3/backend
```

If the team truly keeps three separate repos during development, use semantic commits and copy/merge only owned directories into the integration repo.

Recommended commits:

```text
feat(frontend): add expert capture workspace
feat(voice): add interviewer agent adapter
feat(vision): add ScreenEvent extraction
feat(backend): add decision evaluator
feat(workmap): add WorkMap generation
```

Avoid giant mixed commits that touch all three layers.

---

# 9. Secrets / Environment Variables

No real secrets in source control.

Conceptually:

```env
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
NEXT_PUBLIC_API_BASE_URL=
```

Provider-specific secrets remain with the service that owns them.

The frontend receives only public-safe configuration or short-lived credentials where explicitly required.

---

# 10. What Must Never Happen

```text
❌ Person 1 calls Claude directly
❌ Person 1 contains Anthropic prompts
❌ Person 1 encodes ElevenLabs message schemas
❌ Person 2 directly mutates ticket/database state
❌ Person 2 decides whether Save is authorized
❌ Person 3 edits React component state
❌ Tutor invents a workflow rule unsupported by WorkMap
❌ Voice response controls Save authorization
❌ Raw screenshots are streamed continuously as ordinary agent context
❌ Three branches silently modify shared/types.ts differently
```

---

# 11. Integration Definition of Done

The three implementations are ready to merge when:

```text
P1 passes frontend mock acceptance
P2 passes ElevenLabs conversation acceptance
P3 passes backend/vision/evaluator acceptance
      ↓
shared contracts unchanged or formally updated
      ↓
golden fixture test passes
      ↓
full Capture → Map → Teach path passes
      ↓
critical data-loss save block passes with voice disabled
```

The final criterion is not “all three repos run independently.” It is that the three layers can execute the same golden user journey through stable contracts.
