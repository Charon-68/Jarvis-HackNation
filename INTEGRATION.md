# AI Apprentice — Integration Contract

> **Purpose:** Concrete integration contract for the three-person hackathon implementation.
>
> **Product:** AI Apprentice — Support Ticket Triage
>
> **Core flow:** Capture → Map → Teach
>
> **Primary owners:** Person 1 = frontend/workflow UI, Person 2 = ElevenLabs/conversation, Person 3 = vision/reasoning/backend.
>
> **Status:** Hackathon MVP integration contract
>
> **Architecture update:** ElevenLabs native capabilities now handle a larger share of the conversational pipeline: Web SDK/Widget, Dynamic Variables, Client/Webhook Tools, multi-stage agent flows/workflows/procedures, interactive voice simulation/testing, and conversation analysis/data collection.

---

# 1. Why This File Exists

The three developers are working in parallel against one central repository and may use separate coding agents. The biggest integration risk is not the individual components; it is that the components evolve incompatible assumptions.

This file defines the **boundary between the three implementation layers**:

```text
                         CENTRAL CONTRACTS
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
      PERSON 1              PERSON 2              PERSON 3
      Frontend              ElevenLabs            Vision + Backend
      Product UI            Conversation          Intelligence
          │                     │                     │
          └────────────── Shared JSON/TS ─────────────┘
```

The most important rule is:

> **No developer should depend directly on another developer's internal implementation. Depend on the shared contracts.**

The canonical shared objects are:

- `Session`
- `ScreenEvent`
- `ExpertAnswer`
- `WorkMapStep`
- `WorkMap`
- `DecisionAttempt`
- `TutorIntervention`
- `CaptureStatus`
- `AgentMessage`

Additional ElevenLabs-specific state must remain behind the `VoiceAgentAdapter`/provider boundary.

The canonical code definitions should live in the shared source/schema location agreed by the repository. This document defines their meaning and integration behavior.

---

# 2. Scope of the MVP

The MVP is one controlled support-ticket workflow.

```text
EXPERT
  │
  │ processes support tickets
  ▼
CAPTURE
  │
  ├── browser screen capture
  ├── semantic screen-event extraction
  └── ElevenLabs interviewer
  │        │
  │        └── Dynamic Variables / Client Tools / Webhooks
  ▼
DEBRIEF
  │
  ├── ElevenLabs multi-stage conversational flow
  ├── unanswered questions
  └── expert teach-back confirmation
  ▼
MAP
  │
  └── verified Work Map
  ▼
TEACH
  │
  ├── new unseen ticket
  ├── trainee screen observation
  ├── deterministic decision evaluation
  └── ElevenLabs voice tutor/intervention
  ▼
ANALYSIS / RESULTS
  │
  └── ElevenLabs Conversation Analysis / Data Collection + app results
```

This integration document intentionally does **not** include Bright Data, WebArena, O*NET runtime integration, multi-expert comparison, autonomous task execution, or other deferred work in the critical path.

---

# 3. Updated Tool Responsibility Model

The new implementation principle is:

> **Use each provided platform for the capability it is best at; do not rebuild native ElevenLabs capabilities in our application.**

| Layer | Primary responsibility | Tool |
|---|---|---|
| Product/workflow UI | Support Triage app, screen-share UX, Work Map, training UI | Lovable / React/Next |
| Conversation | Voice, interviewer, tutor, conversational turn-taking | ElevenAgents |
| Agent context/integration | Pass workflow state and trigger frontend/server actions | ElevenLabs Dynamic Variables + Client/Webhook Tools |
| Debrief orchestration | Multi-stage questioning, gap closure, teach-back | ElevenLabs Workflows / Procedures / multi-stage flow |
| Voice training | Interactive voice coaching/testing | ElevenAgents / interactive voice simulation/testing |
| Conversation analytics | Structured post-session evaluation/metadata | ElevenLabs Conversation Analysis / Data Collection |
| Screen perception | Screenshot/frame → semantic `ScreenEvent` | Anthropic Claude Vision |
| Knowledge synthesis | Events + answers → `WorkMap` | Claude / structured reasoning layer |
| Critical decision enforcement | Known rule → allow/block Save | Deterministic evaluator |
| Semantic evaluation/explanation | Ambiguous cases and natural-language explanation | Claude |
| Privacy | PII redaction and masking | Presidio |
| Storage | Session, events, Work Map, results | Lightweight backend/DB |

---

# 4. Shared Repository Documentation Contract

The following files are shared sources of truth:

| File | Purpose | Editing rule |
|---|---|---|
| `README.md` | Product overview, setup, demo, quickstart | All may improve; avoid architectural rewrites without agreement |
| `CONTEXT.md` | Stable project context and challenge interpretation | Controlled context; change when team decisions change |
| `ARCHITECTURE.md` | System architecture and design decisions | Architecture changes require team agreement |
| `WORKFLOW.md` | Canonical Support Triage workflow and cases | Workflow changes require agreement |
| `INTEGRATION.md` | API/event/data/provider contracts | Contract changes require all affected owners to agree |
| `shared/types.ts` | Machine-readable canonical interfaces | **Authoritative implementation contract** |
| `shared/demo-tickets.*` | Deterministic demo cases | Must remain aligned with `WORKFLOW.md` |

Coding agents must read these files before changing integration-facing behavior.

---

# 5. Team Ownership Boundary

## Person 1 — Frontend / Product / Workflow UI

Owns:

- Support Triage web application;
- Expert Capture interface;
- browser screen-sharing UX;
- ticket state and user interaction;
- Work Map UI;
- evidence/replay UI;
- New Hire training interface;
- intervention UI;
- training results UI;
- client-side integration adapters;
- ElevenLabs Widget/SDK placement in the interface;
- capture state and UI lifecycle.

Consumes from Person 2:

- agent status;
- agent question state;
- transcript/answer events;
- tutor intervention content;
- optional UI tool commands.

Consumes from Person 3:

- `ScreenEvent[]`;
- `WorkMap`;
- `TutorIntervention`;
- evaluation results;
- evidence references.

Must not depend on:

- Claude SDK internals;
- Anthropic prompt implementation;
- ElevenLabs private configuration;
- Person 3 database schema;
- provider-specific agent internals.

---

## Person 2 — ElevenLabs / Conversation

Owns:

- ElevenAgents interviewer configuration;
- interviewer prompt/behavior;
- live question behavior;
- voice turn behavior;
- Dynamic Variables;
- Client Tools / Webhook Tools required by the agent;
- expert answer capture;
- debrief/multi-stage conversational flow;
- teach-back;
- tutor agent;
- spoken intervention;
- interactive voice simulation/testing;
- ElevenLabs Conversation Analysis / Data Collection configuration;
- ElevenLabs-specific integration code.

Consumes from Person 3:

- relevant `ScreenEvent[]`;
- current workflow/ticket context;
- Work Map/relevant guardrails where needed;
- evaluation context.

Sends to shared layer:

- `AgentMessage`;
- `ExpertAnswer`;
- voice/agent status events;
- structured analysis results where required.

Must not depend on:

- frontend component internals;
- React state implementation;
- database implementation details.

---

## Person 3 — Vision / Reasoning / Backend

Owns:

- screenshot → `ScreenEvent`;
- event normalization;
- Work Map generation;
- guardrail extraction;
- new-hire evaluation;
- deterministic workflow rules;
- backend orchestration;
- persistence;
- privacy/redaction integration.

Consumes:

- screenshots/frames;
- workflow state;
- `ExpertAnswer[]`;
- session metadata.

Produces:

- `ScreenEvent[]`;
- `WorkMap`;
- `TutorIntervention`;
- persistence APIs;
- evaluation results.

Must not depend on:

- frontend component hierarchy;
- ElevenLabs prompt implementation;
- provider-specific voice internals;
- browser-specific UI state except through contracts/API inputs.

---

# 6. The Shared Contract Model

The system has three distinct kinds of truth.

## 6.1 Workflow truth

The fake Support Triage application has deterministic state.

The frontend knows when the user:

- opens a ticket;
- changes priority;
- changes team;
- changes action;
- presses Save.

This is application state.

## 6.2 Observed truth

The screen-analysis layer creates semantic observations:

- `T003 opened`;
- `priority changed → P1`;
- `team changed → Engineering`;
- `action changed → STOP + escalate`.

This is represented as `ScreenEvent`.

## 6.3 Learned knowledge

The Apprentice learns the **reasoning and guardrails** from the expert's session.

That knowledge is represented by the `WorkMap`.

```text
Workflow state
    │
    ├── deterministic facts
    └── current UI values
              │
              ▼
       ScreenEvent[]
              │
              ├──────────────┐
              │              │
              ▼              ▼
          ElevenAgents     Backend
          context          reasoning
              │              │
              ▼              ▼
        Expert answers     Work Map
              └───────┬──────┘
                      ▼
                Learned knowledge
```

The frontend may know the actual state of the controlled demo app. Claude/ElevenAgents determine or explain learned knowledge. Neither side should silently redefine the other.

---

# 7. Canonical TypeScript Contracts

These are the intended canonical shapes. The actual definitions in `shared/types.ts` become authoritative once committed.

## 7.1 Session

```ts
export type SessionMode = "expert" | "training";

export type SessionPhase =
  | "ready"
  | "capturing"
  | "debrief"
  | "map_ready"
  | "training"
  | "completed"
  | "error";

export interface Session {
  id: string;
  mode: SessionMode;
  phase: SessionPhase;
  workflowName: "Support Ticket Triage";
  startedAt: string;
  endedAt?: string;
  expertName?: string;
  traineeName?: string;
  agentConversationId?: string;
  workMapId?: string;
}
```

---

## 7.2 ScreenEvent

A `ScreenEvent` is a meaningful workflow observation, not a raw pixel diff.

```ts
export type ScreenEventType =
  | "ticket_opened"
  | "priority_changed"
  | "team_changed"
  | "action_changed"
  | "decision_saved";

export type ScreenEventSource =
  | "vision"
  | "workflow_state"
  | "hybrid";

export interface ScreenEvent {
  id: string;
  sessionId: string;
  timestampMs: number;
  ticketId: string;
  type: ScreenEventType;
  description: string;
  previousValue?: string;
  newValue?: string;
  screenshotRef?: string;
  source?: ScreenEventSource;
  confidence?: number;
}
```

### Example

```json
{
  "id": "evt_017",
  "sessionId": "session_01",
  "timestampMs": 50000,
  "ticketId": "T003",
  "type": "action_changed",
  "description": "Expert changed the ticket action to STOP + escalate",
  "newValue": "STOP + escalate",
  "screenshotRef": "frame_050",
  "source": "hybrid"
}
```

### Rules

- Events describe **workflow-relevant changes**.
- Do not emit events for every cursor movement or pixel difference.
- `ticketId` is required for workflow events in this demo.
- `timestampMs` refers to the session timeline, not wall-clock time exposed to the UI.
- `screenshotRef` is evidence, not a requirement to persist an entire video.
- The event source should be recorded where practical.

---

# 8. ExpertAnswer

```ts
export type AnswerPhase = "capture" | "debrief";

export interface ExpertAnswer {
  id: string;
  sessionId: string;
  timestampMs: number;
  question: string;
  answer: string;
  phase: AnswerPhase;
  relatedEventId?: string;
  relatedEventIds?: string[];
}
```

### Rules

- Answers originate from the expert's spoken response.
- `phase="capture"` means the question was asked during live task execution.
- `phase="debrief"` means the question was asked after the task.
- Prefer attaching an answer to the event that triggered the question.
- Do not rewrite the expert's answer before storing the raw answer.
- Any later summarization belongs in the Work Map, not in `ExpertAnswer`.

---

# 9. WorkMapStep

```ts
export interface WorkMapStep {
  id: string;
  stepNumber: number;
  timestampMs: number;
  ticketId?: string;
  observedAction: string;
  decision: string;
  expertReason: string;
  guardrails: string[];
  exceptions: string[];
  teachingPoint: string;
  screenshotRef?: string;
  expertQuote?: string;
  sourceEventIds?: string[];
}
```

### Rules

- Every important step must be traceable to evidence.
- `expertReason` captures the reason the expert gave, not generic AI reasoning.
- `guardrails` contains conditions that constrain behavior.
- `exceptions` contains cases where the normal path changes.
- `teachingPoint` expresses what the new hire should learn.
- `sourceEventIds` should be used whenever the step maps to one or more screen events.

---

# 10. WorkMap

```ts
export interface WorkMap {
  id: string;
  sessionId: string;
  workflowName: "Support Ticket Triage";
  expertName: string;
  durationSeconds: number;
  steps: WorkMapStep[];
  summary?: string;
  guardrails?: string[];
  exceptions?: string[];
  confirmedByExpert?: boolean;
  confirmedAt?: string;
}
```

### Work Map invariant

The Work Map is the **canonical learned knowledge object**.

The tutor should consume the Work Map rather than independently reconstructing the expert's process from a raw transcript.

---

# 11. DecisionAttempt

This represents a trainee's attempted final triage decision.

```ts
export interface DecisionAttempt {
  id: string;
  sessionId: string;
  ticketId: string;
  timestampMs: number;
  priority?: string;
  team?: string;
  action?: string;
  submitted: boolean;
}
```

The evaluator uses the current workflow state and learned Work Map knowledge to decide whether intervention is necessary.

---

# 12. TutorIntervention

```ts
export interface TutorIntervention {
  ticketId: string;
  attemptedDecision: {
    priority?: string;
    team?: string;
    action?: string;
  };
  correct: boolean;
  severity: "warning" | "critical";
  message: string;
  reason: string;
  guardrail?: string;
  expertEvidence?: {
    workMapStepId: string;
    timestampMs: number;
    screenshotRef?: string;
  };
}
```

### Rules

- `correct=false` means the attempted decision conflicts with the expected workflow/guardrail.
- `severity="critical"` is appropriate for the P1 data-loss guardrail.
- The intervention should be generated before the frontend commits the unsafe save.
- `expertEvidence` should point to the relevant Work Map step when available.

---

# 13. AgentMessage

This is the provider-neutral UI representation of a voice-agent message/event.

```ts
export type AgentMessageRole =
  | "agent"
  | "user"
  | "system";

export type AgentMessageKind =
  | "question"
  | "answer"
  | "status"
  | "intervention"
  | "teach_back";

export interface AgentMessage {
  id: string;
  sessionId: string;
  timestampMs: number;
  role: AgentMessageRole;
  kind: AgentMessageKind;
  text: string;
  relatedEventId?: string;
  relatedStepId?: string;
}
```

The frontend uses this to render the conversational timeline. It should not need to know ElevenLabs' internal message format.

---

# 14. CaptureStatus

```ts
export type CaptureStatus =
  | "idle"
  | "requesting"
  | "active"
  | "paused"
  | "stopped"
  | "error";

export interface CaptureState {
  status: CaptureStatus;
  startedAtMs?: number;
  pausedAtMs?: number;
  totalPausedMs?: number;
  error?: string;
}
```

The browser/UI owns this state. Voice agents do not silently change recording state.

---

# 15. End-to-End Integration Flow

## 15.1 Expert Capture

```text
Person 1 Browser
      │
      ├── support workflow state
      ├── screen share
      └── sampled frames
              │
              ▼
       Person 3 / Vision
              │
              ▼
        ScreenEvent[]
              │
        ┌─────┴──────────────┐
        │                    │
        ▼                    ▼
   Person 1 UI         Person 2 / ElevenLabs
                             │
                    Dynamic Variables
                       / Client Tools
                     / Webhook Tools
                             │
                             ▼
                      contextual question
                             │
                             ▼
                       expert answer
                             │
                             ▼
                       ExpertAnswer
                             │
                             ▼
                         shared/backend
```

The important change is that Person 2 should use native ElevenLabs context/tool mechanisms rather than implementing a second custom polling system.

---

# 16. ElevenLabs Integration Boundary

ElevenLabs is now a **first-class conversational subsystem** rather than only a voice API.

The logical behaviors are:

```text
Expert session
    ↓
Interviewer

Post-task
    ↓
Debrief / Teach-back

Training session
    ↓
Tutor

Post-session
    ↓
Conversation Analysis / Data Collection
```

These may be separate configured agents or mode-specific configurations depending on implementation reliability.

## 16.1 Web SDK / Widget

Person 2 owns the ElevenLabs-specific SDK/client setup.

Person 1 integrates a provider-neutral wrapper into the side panel.

The frontend should know only:

```ts
interface VoiceAgentAdapter {
  start(
    sessionId: string,
    mode: "interviewer" | "tutor"
  ): Promise<void>;

  stop(): Promise<void>;

  sendContext(
    context: Record<string, string | number | boolean | null>
  ): Promise<void>;

  sendScreenEventContext(
    events: ScreenEvent[]
  ): Promise<void>;

  sendWorkMapContext(
    workMap: WorkMap
  ): Promise<void>;

  onMessage(
    callback: (message: AgentMessage) => void
  ): () => void;

  onStatusChange(
    callback: (status: string) => void
  ): () => void;
}
```

The exact ElevenLabs SDK calls stay inside Person 2's implementation.

The Web SDK/Widget should be the preferred way to embed the low-latency conversational agent into the web application when supported by the selected implementation.

---

# 17. Dynamic Variables Contract

Dynamic Variables are the preferred mechanism for exposing concise current application context to ElevenAgents.

Useful values can include:

```text
session_id
mode
current_ticket_id
current_ticket_scope
current_ticket_type
current_priority
current_team
current_action
latest_screen_event
capture_status
recent_decision_count
```

Example conceptual context:

```json
{
  "current_ticket_id": "T003",
  "current_priority": "P1",
  "current_team": "Engineering",
  "current_action": "STOP + escalate",
  "latest_screen_event": "Expert changed action to STOP + escalate",
  "capture_status": "active"
}
```

### Rules

- Keep variables compact and semantic.
- Do not continuously inject raw screenshots.
- Do not put secrets into dynamic variables.
- Do not use dynamic variables as the long-term persistence mechanism.
- The backend remains the source of persistent session data.

---

# 18. Client Tools and Webhook Tools

The new architecture uses ElevenLabs tools for agent↔application integration.

## 18.1 Client Tools

Client tools are appropriate when the voice agent needs the browser/application to do something visible.

Examples:

```text
show_intervention()
open_workmap_step(step_id)
replay_expert_evidence(step_id)
highlight_ticket(ticket_id)
show_notification(message)
```

Conceptual interface:

```ts
interface ApprenticeClientTools {
  showIntervention(intervention: TutorIntervention): void;
  openWorkMapStep(stepId: string): void;
  replayEvidence(stepId: string): void;
  highlightTicket(ticketId: string): void;
}
```

The exact ElevenLabs tool registration stays inside Person 2's provider adapter.

## 18.2 Webhook Tools

Webhook/server-side tools are appropriate for operations involving backend state or server-side computation.

Examples:

```text
get_current_ticket_context
get_relevant_workmap_rule
evaluate_training_decision
persist_agent_event
```

### Important boundary

Client Tools and Webhooks should not replace the canonical backend/data contracts.

They are **integration mechanisms**, not the system of record.

---

# 19. Passing Screen Events to ElevenAgents

The intended information flow is:

```text
ScreenEvent
     ↓
context/event bridge
     ↓
ElevenAgents
     ↓
agent understands current decision
     ↓
asks targeted question
```

Example semantic context:

```text
T003 opened.
Priority changed to P1.
Team changed to Engineering.
Action changed to STOP + escalate.
```

Do not send an unbounded stream of raw screenshots as normal agent context.

### Important timing rule

The arrival of a `ScreenEvent` is **not automatically permission to speak**.

Question timing belongs to the conversation layer.

The agent should consider:

- whether the expert is actively working;
- whether the event represents a meaningful judgment point;
- whether the screen already answers the question;
- whether another question was just asked;
- whether a guardrail has not yet been explored.

The application can expose activity/session context through Dynamic Variables or Client Tools, while ElevenAgents handles the conversational behavior.

---

# 20. Question Selection Contract

Person 2 should receive enough context to construct questions like:

```text
Event:
T001 priority changed → P1

Question intent:
Reveal reasoning for severity.
```

or:

```text
Event:
T003 action → STOP + escalate

Question intent:
Reveal safety guardrail / stop condition.
```

The interviewer should prioritize:

1. reasoning;
2. thresholds;
3. scope/impact interpretation;
4. exceptions;
5. stop/ask conditions;
6. what the expert would never do.

Avoid generic questions such as:

> "What are you doing?"

when the screen already clearly shows the action.

### Natural-pause behavior

ElevenAgents should remain quiet while the expert is actively typing, reading, or speaking and ask at an appropriate pause. The agent's native conversation/turn-taking capabilities should be preferred over custom frontend polling.

---

# 21. Expert Answer Integration

A spoken answer should become an `ExpertAnswer`.

```text
ElevenAgents
    ↓
spoken response
    ↓
provider adapter
    ↓
ExpertAnswer
    ↓
related ScreenEvent
```

Example:

```json
{
  "id": "ans_03",
  "sessionId": "session_01",
  "timestampMs": 52000,
  "question": "Why did you stop normal troubleshooting on T003?",
  "answer": "Possible data loss means we stop and escalate.",
  "phase": "capture",
  "relatedEventId": "evt_017"
}
```

Keep the raw expert response intact. Summarization belongs downstream in Work Map generation.

---

# 22. Debrief Integration

At session end:

```text
Capture session
      ↓
freeze event stream
      ↓
ElevenLabs multi-stage debrief flow
      ↓
follow-up questions
      ↓
ExpertAnswer[]
      ↓
teach-back
      ↓
expert confirms/corrects
      ↓
Work Map generation
```

The PS requires at least three debrief follow-ups that were not already answered during the task, ending with a teach-back that the expert confirms or corrects.

## Debrief context

The debrief flow should receive:

- events collected during capture;
- questions already asked;
- expert answers already recorded;
- unresolved or low-confidence items;
- relevant workflow metadata.

The debrief should produce additional `ExpertAnswer` records rather than silently editing previous answers.

## Multi-stage flow

The ElevenLabs workflow should conceptually contain stages such as:

```text
Stage 1 — Review observed decisions
Stage 2 — Ask unresolved/exception questions
Stage 3 — Probe guardrails / stop conditions
Stage 4 — Teach-back
Stage 5 — Expert confirmation/correction
Stage 6 — Emit structured debrief result
```

The exact number/staging can change if required by the ElevenLabs implementation, but the semantic behavior must remain.

---

# 23. Work Map Generation Contract

The reasoning service receives:

```ts
interface WorkMapGenerationInput {
  session: Session;
  screenEvents: ScreenEvent[];
  expertAnswers: ExpertAnswer[];
  workflowName: "Support Ticket Triage";
}
```

It returns:

```ts
interface WorkMapGenerationResult {
  workMap: WorkMap;
  warnings?: string[];
}
```

### Generation requirements

The generated Work Map must:

- preserve timestamps;
- preserve ticket IDs where available;
- connect decisions to reasons;
- connect guardrails to evidence;
- preserve expert wording where possible;
- not invent a rule that has no evidence in the session;
- indicate uncertainty/warnings instead of fabricating missing knowledge.

Claude is the preferred synthesis engine.

ElevenLabs structured outputs/workflow data may participate in the pipeline, but the canonical Work Map schema remains owned by the shared/backend contract.

---

# 24. Work Map Validation

Before persistence, the backend should verify:

- required IDs exist;
- step numbers are unique and ordered;
- timestamps are non-negative;
- `guardrails` and `exceptions` are arrays;
- important steps have source evidence where available;
- `workflowName` matches the canonical workflow;
- the Work Map is valid JSON;
- no unsupported rule is presented as expert-confirmed;
- `confirmedByExpert` is only true after actual teach-back confirmation.

Do not save malformed model output directly into the canonical store.

---

# 25. Work Map → Tutor Contract

The tutor receives the Work Map as learned knowledge.

Recommended context structure:

```text
WORKFLOW
  Support Ticket Triage

LEARNED PRINCIPLES
  - assess scope
  - assess impact
  - distinguish isolated issues from systemic incidents

GUARDRAILS
  - possible data loss → stop normal processing + escalate

EXAMPLES
  - T001
  - T003
  - T005
  - T006

CURRENT CASE
  unseen trainee ticket
```

The tutor may ask the backend for relevant Work Map evidence but must not invent an unsupported rule.

The tutor's voice interaction is handled by ElevenAgents; the Work Map remains the source of learned knowledge.

---

# 26. New-Hire Evaluation Contract

Use a hybrid evaluation model.

## Layer 1 — deterministic checks

For the controlled Support Triage workflow, known critical rules should be represented as deterministic backend checks whenever possible.

Example:

```ts
if (
  ticket.hasPotentialDataLoss &&
  action !== "STOP + escalate"
) {
  return criticalIntervention;
}
```

These rules belong in the canonical workflow configuration, not inside UI components.

## Layer 2 — Claude semantic assistance

Claude may help with:

- interpreting ambiguous trainee behavior;
- explaining why the decision is wrong;
- selecting a relevant Work Map step;
- generating natural-language reasoning;
- evaluating a combination of contextual signals.

Do not rely on LLM-only evaluation for the critical guardrail when a deterministic rule can represent it.

---

# 27. Save / Block Protocol

The frontend must treat `allowSave` as authoritative for the controlled demo.

```text
User clicks Save
      ↓
freeze current decision
      ↓
POST decision attempt
      ↓
backend evaluator
      ↓
allowSave?
   /       \
 YES       NO
  /           \
commit       block
               ↓
        TutorIntervention
               ↓
        ElevenAgents voice
               ↓
             retry
```

### Critical rule

> **Never persist the unsafe trainee decision merely because the voice agent was slow to respond.**

The decision evaluator is the safety gate.

Voice is the explanation/coaching layer, not the authorization layer.

---

# 28. Tutor Intervention → UI / Voice

The same semantic `TutorIntervention` should drive both modalities.

## Frontend

Person 1 renders:

```text
┌──────────────────────────────────────────────┐
│ 🔴 CHECK THIS DECISION                       │
│                                              │
│ This case may involve data loss.             │
│                                              │
│ The expert's rule:                           │
│ Possible data loss → STOP + escalate.        │
│                                              │
│ [Replay expert moment]   [Fix decision]      │
└──────────────────────────────────────────────┘
```

## Voice

Person 2 uses the same intervention semantics:

> "Before you submit that, remember the expert's stop-and-escalate rule for possible data loss."

The two modalities must not invent different reasons.

---

# 29. Interactive Voice Training / Testing

The trainee experience should be a real voice interaction, not merely text instructions.

Conceptually:

```text
New Hire
   ↓
works on ticket
   ↓
voice tutor observes context
   ↓
asks prediction / reasoning question
   ↓
trainee responds
   ↓
decision evaluator checks state
   ↓
Tutor explains / intervenes
```

ElevenLabs interactive voice simulation/testing capabilities can be used to make the trainee interaction more realistic.

However:

- the Support Triage UI remains our application;
- deterministic save/block logic remains our backend/application logic;
- the Work Map remains the canonical learned knowledge;
- voice simulation must not become a hidden second source of workflow truth.

---

# 30. Conversation Analysis / Data Collection

Post-session analysis can use ElevenLabs' native Conversation Analysis/Data Collection capabilities for structured conversational information.

Useful fields may include:

```text
live_question_count
guardrail_question_asked
debrief_question_count
teach_back_completed
expert_confirmation
tutor_intervention_count
training_success
```

These should feed the application result layer where appropriate.

### Boundary

ElevenLabs may provide conversation-level evaluation/structured outputs, but the app's final training result can combine:

```text
ElevenLabs conversation analysis
        +
deterministic decision results
        +
Work Map evidence
        +
session metadata
```

Do not duplicate a full conversation-analysis engine in our backend unless necessary.

---

# 31. Expert Evidence Replay

A Work Map step may point to a `screenshotRef`.

```text
WorkMapStep
      ↓
screenshotRef
      ↓
evidence viewer
```

The actual media storage format is not part of the UI contract.

`screenshotRef` can point to:

- stored image;
- signed object URL;
- local demo fixture;
- generated evidence identifier.

The frontend must accept the reference without knowing where the artifact is stored.

---

# 32. Privacy / Off-the-Record Integration

## Pause

The frontend owns the recording control:

```text
active → paused
```

While paused:

- do not process new frames;
- do not append new screen events from capture;
- update UI visibly;
- communicate paused state to the voice layer where practical.

## Resume

```text
paused → active
```

## Redaction

Where practical:

```text
frame / transcript
      ↓
Presidio
      ↓
redacted representation
      ↓
backend storage / downstream AI
```

The MVP uses fake support data, but privacy behavior should still be demonstrable.

---

# 33. Browser Screen Capture Contract

The browser owns actual screen capture.

## Required lifecycle

```text
idle
  ↓
requesting
  ↓
active
  ↓
paused
  ↓
active
  ↓
stopped
```

The UI must handle:

- permission rejection;
- user cancelling screen selection;
- browser stream ending unexpectedly;
- pause/resume;
- explicit stop;
- session end.

## Frame handoff

Person 1 owns the capture surface and should expose a callback/service boundary:

```ts
interface ScreenCaptureController {
  start(): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  getStatus(): CaptureStatus;
  onFrame(
    callback: (frame: Blob | ImageBitmap) => void
  ): () => void;
  onStatusChange(
    callback: (status: CaptureState) => void
  ): () => void;
}
```

Person 3 decides how frames are sampled and sent to Claude.

The frontend must not know Claude's request/response format.

---

# 34. Event Generation Strategy

The intended architecture is:

```text
screen frame
   ↓
change/relevance check
   ↓
Claude Vision
   ↓
structured ScreenEvent
```

For the controlled demo, deterministic workflow state may also be used as a supporting signal:

```text
Browser workflow state ───────┐
                              ├──► event normalization ─► ScreenEvent
Sampled screenshot ─► Claude ┘
```

This is intentionally a hybrid reliability design.

### Why

The demo must reliably prove the concept. Total dependence on vision OCR/understanding can cause a failure even when the expert clearly made the expected UI action.

The event source should therefore be recorded in `ScreenEvent.source` where practical.

---

# 35. API Contract

The actual implementation may use different route names, but these logical operations must exist.

## `POST /api/sessions`

Create a session.

```json
{
  "mode": "expert",
  "expertName": "Demo Expert"
}
```

Response:

```json
{
  "session": {
    "id": "session_01",
    "mode": "expert",
    "phase": "ready",
    "workflowName": "Support Ticket Triage",
    "startedAt": "2026-10-04T00:00:00.000Z"
  }
}
```

---

## `POST /api/screen-events`

Accept one or more structured screen events.

```json
{
  "events": [
    {
      "id": "evt_017",
      "sessionId": "session_01",
      "timestampMs": 50000,
      "ticketId": "T003",
      "type": "action_changed",
      "description": "Expert changed action to STOP + escalate",
      "newValue": "STOP + escalate"
    }
  ]
}
```

---

## `POST /api/expert-answers`

Store interviewer/debrief answers.

```json
{
  "answer": {
    "id": "ans_03",
    "sessionId": "session_01",
    "timestampMs": 52000,
    "question": "Why did you stop normal troubleshooting on T003?",
    "answer": "Possible data loss means we stop and escalate.",
    "phase": "capture",
    "relatedEventId": "evt_017"
  }
}
```

---

## `POST /api/sessions/:sessionId/end`

Marks the capture session as finished and triggers/delegates the debrief/map processing.

Response:

```json
{
  "sessionId": "session_01",
  "phase": "debrief"
}
```

---

## `POST /api/work-maps/generate`

Generate or regenerate a Work Map from the completed session.

Request:

```json
{
  "sessionId": "session_01"
}
```

---

## `GET /api/work-maps/:workMapId`

Returns the canonical Work Map used by the frontend/tutor.

---

## `POST /api/training/decision-attempt`

Evaluates a trainee decision.

Request:

```json
{
  "decisionAttempt": {
    "id": "attempt_02",
    "sessionId": "training_01",
    "ticketId": "T_NEW_01",
    "timestampMs": 41000,
    "priority": "P3",
    "team": "Support",
    "action": "Normal troubleshooting",
    "submitted": false
  }
}
```

Correct response:

```json
{
  "allowSave": true,
  "intervention": null
}
```

Incorrect response:

```json
{
  "allowSave": false,
  "intervention": {
    "ticketId": "T_NEW_01",
    "attemptedDecision": {
      "priority": "P3",
      "team": "Support",
      "action": "Normal troubleshooting"
    },
    "correct": false,
    "severity": "critical",
    "message": "Possible data loss is a stop-and-escalate case.",
    "reason": "The expert explicitly identified potential data loss as a safety guardrail.",
    "guardrail": "Possible data loss → stop normal processing and escalate.",
    "expertEvidence": {
      "workMapStepId": "step_04",
      "timestampMs": 50000,
      "screenshotRef": "frame_050"
    }
  }
}
```

---

# 36. Frontend Adapter Contract

Person 1 should interact with backend/AI through adapter functions instead of scattering fetch logic through components.

Recommended interface:

```ts
export interface ApprenticeApi {
  createSession(input: {
    mode: SessionMode;
    expertName?: string;
    traineeName?: string;
  }): Promise<Session>;

  appendScreenEvents(events: ScreenEvent[]): Promise<void>;

  appendExpertAnswer(answer: ExpertAnswer): Promise<void>;

  endSession(sessionId: string): Promise<Session>;

  getWorkMap(workMapId: string): Promise<WorkMap>;

  createWorkMap(sessionId: string): Promise<WorkMap>;

  evaluateDecision(
    attempt: DecisionAttempt
  ): Promise<{
    allowSave: boolean;
    intervention: TutorIntervention | null;
  }>;
}
```

During parallel development, Person 1 may implement a `MockApprenticeApi` with the **same interface**.

The real implementation can later replace the mock without changing UI components.

---

# 37. Voice Adapter Contract

Person 2 should isolate all ElevenLabs-specific operations behind one provider adapter.

```ts
export interface VoiceAgentAdapter {
  connect(input: {
    sessionId: string;
    mode: "interviewer" | "tutor";
  }): Promise<void>;

  disconnect(): Promise<void>;

  updateContext(
    context: Record<string, unknown>
  ): Promise<void>;

  sendScreenEvent(
    event: ScreenEvent
  ): Promise<void>;

  sendWorkMap(
    workMap: WorkMap
  ): Promise<void>;

  sendIntervention(
    intervention: TutorIntervention
  ): Promise<void>;

  onMessage(
    callback: (message: AgentMessage) => void
  ): () => void;

  onStatusChange(
    callback: (status: string) => void
  ): () => void;
}
```

The exact Web SDK/Widget, Dynamic Variable, Client Tool, Webhook, workflow, and analysis calls must remain inside this adapter.

This prevents Person 1 from depending on ElevenLabs implementation details.

---

# 38. ElevenLabs Data Ownership Boundary

To avoid duplicate state:

### ElevenLabs owns

- conversational audio;
- conversation turn state;
- agent conversation/session state;
- voice messages;
- agent-specific conversational flow state;
- provider-native conversation analysis/data collection.

### Our application owns

- Support Triage workflow state;
- current ticket;
- Priority/Team/Action values;
- screen capture state;
- canonical ScreenEvents;
- canonical ExpertAnswers;
- canonical WorkMap;
- deterministic save/block decision;
- evidence references;
- final application-level training result.

### Shared

- context passed to the agent;
- provider-neutral `AgentMessage`;
- tutor intervention semantics.

The voice agent must not become the hidden system of record for business state.

---

# 39. Mock Mode

Mock mode is a first-class development feature.

Each integration-facing service should have a mock implementation:

```text
MockScreenEventProvider
MockVoiceAgent
MockWorkMapProvider
MockDecisionEvaluator
```

This allows:

- Person 1 to complete the UI before AI is integrated;
- Person 2 to test conversations against deterministic events;
- Person 3 to test Work Map/evaluation without the final frontend.

The mock data must use the same shared schemas as the live implementation.

---

# 40. Golden Fixture Set

At minimum, maintain:

```text
fixtures/
├── expert-session.json
├── screen-events.json
├── expert-answers.json
├── work-map.json
├── trainee-case.json
└── tutor-intervention.json
```

These fixtures should represent the golden Support Triage demonstration.

This makes it possible to test the complete UI and Work Map without external services.

---

# 41. Golden Expert Fixture

The event sequence should approximately contain:

```text
T001 opened
T001 priority → P1
T001 team → Infrastructure
T001 action → Immediate escalation

T002 opened
T002 priority → P3
T002 team → Support
T002 action → Normal troubleshooting

T003 opened
T003 priority → P1
T003 team → Engineering
T003 action → STOP + escalate

T005 opened
T005 priority → P1
T005 team → Engineering
T005 action → Immediate escalation

T006 opened
T006 priority → P2
T006 team → Engineering
T006 action → Investigate performance
```

The exact screen timing may vary between live runs, but the semantic event sequence should remain stable.

---

# 42. Canonical Expert Answers

At least these knowledge points should be captured.

### T001

**Question intent:** Why is T001 P1?

**Expected knowledge:** The entire production website is down, so impact is global and immediate escalation is required.

### T003

**Question intent:** Why stop normal troubleshooting?

**Expected knowledge:** Possible data loss is a safety guardrail. Stop normal processing and escalate; do not ask the customer to modify/retry data in a way that could worsen the situation or destroy evidence.

### T005

**Question intent:** What changed when many customers were affected?

**Expected knowledge:** Multiple customers reporting the same API failure suggests a systemic incident and should be escalated to Engineering.

These are workflow expectations for the hackathon demo, not universal support policies.

---

# 43. Canonical New-Hire Test

Recommended unseen scenario:

> **Multiple customers lost transaction history after an update.**

Intended knowledge:

```text
multiple customers
      +
possible data loss
      ↓
high-impact systemic issue
      ↓
P1 / Engineering / STOP + escalate
```

Recommended trainee mistake:

```text
P3 / Support / Normal troubleshooting
```

Expected system response:

```text
Decision evaluator → incorrect
          ↓
allowSave = false
          ↓
TutorIntervention
          ↓
ElevenLabs voice explanation
          ↓
relevant expert evidence
          ↓
trainee corrects decision
```

This single path is the most important cross-person integration test.

---

# 44. Agent Status Integration

The frontend should display agent status generically.

Suggested states:

```text
idle
connecting
listening
thinking
speaking
paused
error
```

Do not expose provider-specific internal statuses to the normal product UI.

Example frontend text:

```text
Listening quietly…
Thinking…
I have a question…
Speaking…
Voice temporarily unavailable
```

---

# 45. Event Ordering

All integration events should be ordered by `timestampMs` within a session.

If two events have the same timestamp, use insertion order or a stable ID as the tie-breaker.

Do not use network arrival order as semantic order.

Example:

```text
Network A arrives first:
T005 action changed

Network B arrives second:
T005 ticket opened

Semantic order must still be:
T005 ticket opened
→ T005 action changed
```

---

# 46. Idempotency

The following operations should be safe to retry:

- append `ScreenEvent`;
- append `ExpertAnswer`;
- save Work Map;
- evaluate a `DecisionAttempt`.

Use stable IDs.

A repeated network request must not create duplicate semantic events.

---

# 47. Error Contract

Services should return structured errors:

```ts
export interface IntegrationError {
  code: string;
  message: string;
  retryable: boolean;
  requestId?: string;
}
```

Recommended codes:

```text
SESSION_NOT_FOUND
INVALID_SCREEN_EVENT
WORKMAP_GENERATION_FAILED
WORKMAP_INVALID
AGENT_UNAVAILABLE
EVALUATION_UNAVAILABLE
CAPTURE_PERMISSION_DENIED
PRIVACY_REDACTION_FAILED
TOOL_EXECUTION_FAILED
CONVERSATION_ANALYSIS_FAILED
```

The frontend should display a human-readable message while logging the technical code for debugging.

---

# 48. Failure Handling

## ElevenLabs fails

The workflow should not crash.

UI:

```text
Voice temporarily unavailable.
```

Fallback:

- continue the controlled workflow where possible;
- preserve session/events;
- use mock fixture or retry during development.

## Claude Vision fails

Preserve the session. Retry event extraction or use the deterministic workflow-state signal for the controlled demo.

## Work Map generation fails

Keep captured events/answers and allow regeneration.

## Evaluator fails

For critical demo guardrails, deterministic checks should remain available where possible.

## ElevenLabs tool call fails

The underlying workflow state must remain valid. A failed UI tool call must not corrupt the session.

## Conversation Analysis fails

The core training result must still be computed from deterministic decision/evaluation data.

## Browser screen share ends unexpectedly

Transition capture to an error/stopped state and let the user retry.

---

# 49. Security / Secrets

Never expose provider secrets in source-controlled frontend code.

Expected server-side environment variables may include:

```env
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
```

Other secrets should follow the repository's existing environment configuration.

Frontend should receive short-lived/public-safe tokens only where the provider explicitly requires a client-side credential/token flow.

Do not commit `.env` files containing real credentials.

---

# 50. Integration Sequence for Development

The team should integrate in this order.

## Stage 1 — Freeze contracts

Agree on:

- `ScreenEvent`;
- `ExpertAnswer`;
- `WorkMapStep`;
- `WorkMap`;
- `DecisionAttempt`;
- `TutorIntervention`;
- `AgentMessage`;
- adapter interfaces.

Commit the shared types.

## Stage 2 — Fixture mode

All three developers make their components work against deterministic fixtures.

## Stage 3 — Person 1 completes UI

Full Capture → Map → Teach navigation works without AI.

## Stage 4 — Person 2 connects ElevenLabs

Connect:

- Web SDK/Widget;
- interviewer;
- Dynamic Variables;
- Client/Webhook Tools;
- debrief flow;
- tutor;
- analysis/data collection.

## Stage 5 — Person 3 connects vision

Claude Vision replaces mock event generation.

## Stage 6 — Context integration

ScreenEvents → application context → ElevenAgents.

## Stage 7 — Work Map integration

Live events + voice transcript → Work Map → UI.

## Stage 8 — Training integration

Unseen case → DecisionAttempt → TutorIntervention → UI + voice intervention.

## Stage 9 — Privacy / reliability

Pause/off-record, redaction, retries, errors, demo hardening.

---

# 51. Merge Strategy

Because three coding agents are operating in parallel:

## Person 1 branch

Prefer touching:

```text
frontend/
ui/
app routes/
client adapters/
capture/
```

## Person 2 branch

Prefer touching:

```text
agents/
elevenlabs/
voice adapters/
prompt/flow configuration/
analysis configuration/
```

## Person 3 branch

Prefer touching:

```text
backend/
vision/
workmap/
evaluation/
privacy/
storage/
```

## Shared files

These are sensitive:

```text
CONTEXT.md
ARCHITECTURE.md
WORKFLOW.md
INTEGRATION.md
shared/types.ts
```

Do not modify shared contracts casually from multiple branches.

When a contract must change:

1. document the reason;
2. update the contract;
3. update affected adapters;
4. update fixtures;
5. run the integration test.

---

# 52. Integration Test Matrix

| Test | Person 1 | Person 2 | Person 3 | Pass condition |
|---|---:|---:|---:|---|
| Expert session starts | ✅ | ✅ | — | Screen + voice session starts cleanly |
| ElevenLabs Widget loads | ✅ | ✅ | — | Voice interface appears in side panel |
| Screen event displayed | ✅ | ✅ | ✅ | Semantic event appears in UI and agent context |
| Live question | ✅ | ✅ | ✅ | Agent asks about visible decision |
| Natural pause behavior | ✅ | ✅ | — | Agent does not unnecessarily interrupt active work |
| Expert answer | ✅ | ✅ | — | Answer associated with event |
| Debrief | ✅ | ✅ | ✅ | ≥3 useful follow-ups |
| Teach-back | ✅ | ✅ | ✅ | Expert confirms/corrects |
| Work Map generation | ✅ | ✅ | ✅ | Valid Work Map appears |
| Work Map evidence | ✅ | — | ✅ | Clicking step opens evidence |
| New unseen case | ✅ | ✅ | ✅ | Case not demonstrated by expert |
| Wrong decision | ✅ | ✅ | ✅ | Evaluation identifies incorrect choice |
| Pre-save block | ✅ | — | ✅ | Unsafe decision never saves |
| Tutor explanation | ✅ | ✅ | ✅ | Spoken/UI explanation references learned rule |
| Correction | ✅ | ✅ | ✅ | Trainee changes decision and proceeds |
| Conversation analysis | ✅ | ✅ | ✅ | Session/training result fields are available |
| Pause recording | ✅ | optional | optional | New capture events stop while paused |
| Error recovery | ✅ | ✅ | ✅ | Provider failure does not destroy session |

---

# 53. Definition of Integration Success

The integration is successful when the three developers' implementations can execute this sequence without manual intervention:

```text
1. Create expert session
2. Share screen
3. Expert opens/processes T001–T003/T005/T006
4. Meaningful screen events arrive
5. ElevenLabs receives semantic context
6. ElevenAgents asks ≥3 live questions
7. Expert answers are associated with events
8. Session ends
9. ElevenLabs debrief asks ≥3 additional follow-ups
10. Teach-back is confirmed/corrected
11. Valid Work Map is generated
12. Work Map is rendered in frontend
13. New training session begins
14. Unseen case is opened
15. Trainee attempts unsafe decision
16. Evaluator returns allowSave=false
17. TutorIntervention appears
18. ElevenLabs explains the learned rule
19. Expert evidence can be replayed
20. Trainee corrects the decision
21. Training result / conversation analysis is shown
```

If the system can do this reliably, the core product is integrated.

---

# 54. What Is Not an Integration Requirement

The following do not need integration into the core path:

- Bright Data;
- WebArena;
- O*NET runtime services;
- MCP-based guardrail lookup;
- multi-expert comparison;
- multilingual expert/tutor mode;
- autonomous agent execution;
- broad enterprise ticket integrations;
- real support-platform connectors.

They may be mentioned as future extensions, but they should not delay Capture → Map → Teach.

---

# 55. Resource-Specific Integration Notes

## Lovable

Used primarily by Person 1 for rapid frontend creation and polish.

The resulting UI must use the shared adapters/contracts rather than embedding provider-specific logic inside components.

## ElevenLabs Creator / ElevenAgents

Use for:

- interviewer;
- debrief;
- teach-back;
- tutor;
- embedded conversational UI;
- dynamic runtime context;
- client/server tool integration;
- voice simulation/testing;
- conversation analysis/data collection.

Prefer native ElevenLabs capabilities over custom equivalents.

## Anthropic credits

Use Claude for:

- screenshot/visual event extraction;
- Work Map generation;
- guardrail reasoning/extraction;
- semantic support during trainee evaluation.

## Presidio

Use where feasible for privacy/redaction of transcript and frame content before downstream storage or processing.

## Bright Data

Not on the critical integration path. Do not introduce a dependency on it for the golden demo.

## O*NET

Reference only for workflow/task research, not runtime integration.

## WebArena

Reference/optional sandbox only; the controlled Support Triage application is the primary demo environment.

## MCP

Optional. It may expose a tutor lookup such as:

```text
get_guardrail(step_id)
```

but the golden demo must not depend on MCP.

---

# 56. Non-Negotiable Integration Rules

1. **Shared contracts are the interface between developers.**
2. **The Work Map is the canonical learned knowledge artifact.**
3. **Screen events describe meaningful workflow changes, not raw video.**
4. **Expert answers remain attributable to the question/event that produced them.**
5. **The tutor uses Work Map knowledge; it does not invent expert rules.**
6. **Critical trainee save/block behavior should be deterministic where possible.**
7. **ElevenLabs is the voice/conversation layer, not the business-state system of record.**
8. **The frontend must not depend on ElevenLabs or Claude internal APIs directly.**
9. **Backend/AI code must not depend on frontend component internals.**
10. **Every major learned decision should have evidence.**
11. **The system must have fixture/mock mode so work can proceed in parallel.**
12. **A provider failure must degrade gracefully rather than corrupt the session.**
13. **No real secrets are committed.**
14. **Workflow definitions stay synchronized with `WORKFLOW.md`.**
15. **Any contract change must be reflected in types, fixtures, adapters and affected consumers.**
16. **Do not rebuild capabilities that ElevenLabs already provides reliably.**
17. **Do not allow voice-agent latency to determine whether a critical trainee decision is saved.**
18. **Do not let optional resources become dependencies of the golden path.**

---

# 57. Final Integration Picture

```text
                         ┌───────────────────────┐
                         │      PERSON 1         │
                         │  WEB APP / FRONTEND   │
                         │                       │
                         │ Capture / Map / Teach│
                         └───────────┬───────────┘
                                     │
                              Shared Contracts
                                     │
              ┌──────────────────────┼───────────────────────┐
              │                      │                       │
              ▼                      ▼                       ▼
        ScreenEvent[]             WorkMap              TutorIntervention
              ▲                      ▲                       ▲
              │                      │                       │
              │               ┌──────┴──────┐                │
              │               │  PERSON 3  │                │
              │               │ Vision /   │                │
              │               │ Reasoning  │                │
              │               │ Backend    │                │
              │               └──────┬──────┘                │
              │                      │                       │
              │             Screen + transcript              │
              │                      │                       │
              │                      ▼                       │
              │               Claude / Storage               │
              │                                               │
              └──────────────────────┐                        │
                                     ▼                        │
                              ┌──────────────┐                │
                              │  PERSON 2    │────────────────┘
                              │ ElevenLabs   │
                              │ Conversation │
                              └──────────────┘
```

The provider-specific layer inside Person 2 is:

```text
                    ElevenLabs
                         │
       ┌─────────────────┼──────────────────┐
       │                 │                  │
   Web SDK/Widget   Dynamic Variables   Client/Webhook Tools
       │                 │                  │
       ├─────────────────┼──────────────────┤
       │                 │                  │
   Interviewer      Context passing     UI/server actions
       │
       ▼
 Multi-stage Debrief
       │
       ▼
   Teach-back
       │
       ▼
      Tutor
       │
       ▼
Voice Simulation / Testing
       │
       ▼
Conversation Analysis / Data Collection
```

The three developers are therefore building **one product**, not three independent products:

> **Person 1 owns what the user sees. Person 2 owns how the Apprentice speaks and listens. Person 3 owns how the system perceives, reasons and persists. Shared contracts connect them.**

The core design principle is now:

> **Our application owns workflow state and deterministic business behavior; ElevenLabs owns conversational interaction; Claude owns multimodal perception and reasoning; the Work Map connects learning to teaching.**

---

# 58. Authoritative References

## Challenge brief

- Local source: `final ps.pdf`
- ElevenLabs × Hack-Nation — 7th Global AI Hackathon — The AI Apprentice

## ElevenLabs

- Quickstart: https://elevenlabs.io/docs/eleven-agents/quickstart
- LLM/model configuration: https://elevenlabs.io/docs/agentsplatform/customization/llm
- Client tools / tools documentation: https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools
- MCP tools: https://elevenlabs.io/docs/elevenagents/customization/tools/mcp

## O*NET

- https://www.onetcenter.org/database.html

## Presidio

- https://github.com/data-privacy-stack/presidio

## Project sources

- `README.md`
- `CONTEXT.md`
- `ARCHITECTURE.md`
- `WORKFLOW.md`
- provided Support Triage workflow spreadsheet/demo

---

# 59. Final Rule for Coding Agents

Before changing an integration-facing component, a coding agent should:

```text
READ
  ↓
CONTEXT.md
  ↓
ARCHITECTURE.md
  ↓
WORKFLOW.md
  ↓
INTEGRATION.md
  ↓
shared/types.ts
  ↓
CHECK PROVIDER BOUNDARY
  ↓
IMPLEMENT
  ↓
TEST AGAINST FIXTURES
  ↓
RUN GOLDEN INTEGRATION TEST
```

When uncertain:

> **Preserve the existing shared contract and provider boundary instead of inventing a new one.**

If ElevenLabs already provides a capability required by the product, use that capability rather than recreating an equivalent custom subsystem.
