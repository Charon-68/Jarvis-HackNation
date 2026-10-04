# AI Apprentice — Final Implementation Contracts

> **Status:** Final MVP integration contract
>
> **Product:** AI Apprentice — Support Ticket Triage
>
> **Product path:** Capture → Map → Teach
>
> **Team boundary:** Person 1 = Frontend/Product, Person 2 = ElevenLabs/Conversation, Person 3 = Vision/Reasoning/Backend
>
> **Contract authority:** `shared/types.ts` is the machine-readable shared type source; this file defines the required integration semantics, API behavior, and ownership boundaries. They must remain synchronized.

---

## 1. Purpose

This document is the final contract between the three implementation layers. It exists to prevent agents or developers from making incompatible assumptions while working in parallel.

The MVP demonstrates one controlled workflow: **Support Ticket Triage**. The system must learn an expert's decision-making process and use that learned knowledge to teach a new employee on an unseen case.

The required product flow is:

```text
EXPERT WORK
  ↓
CAPTURE
  screen/workflow observation + expert questions/answers
  ↓
DEBRIEF + TEACH-BACK
  expert explains gaps, guardrails and exceptions
  ↓
WORK MAP
  structured learned knowledge + evidence
  ↓
TRAINING
  unseen ticket + trainee decision
  ↓
EVALUATION
  deterministic safety rules first, semantic reasoning second
  ↓
TUTOR INTERVENTION
  block unsafe save + explain why + allow retry
```

This contract is the target that the implementation must satisfy. A route or behavior listed here is required even when a current branch has not implemented it yet.

---

## 2. Non-Negotiable Architectural Rules

### 2.1 Application truth vs. learned knowledge

The Support Triage application owns live workflow state: current ticket, currently selected priority/team/action, button state, and whether a save is being attempted.

The `WorkMap` owns learned knowledge: expert reasoning, guardrails, exceptions, teaching points, and evidence references.

Do not reconstruct live workflow state from the Work Map.

### 2.2 Provider neutrality

Shared contracts must not expose raw Anthropic request/response objects or ElevenLabs internal configuration objects.

Claude and ElevenLabs remain behind provider/adaptor boundaries.

### 2.3 ElevenLabs owns conversation

ElevenLabs is the primary conversational layer for:

- voice interaction;
- interviewer behavior;
- debrief orchestration;
- teach-back interaction;
- tutor voice guidance;
- conversation analysis/data collection where useful.

Use ElevenLabs native Web SDK/Widget, Dynamic Variables, Client/Webhook Tools, and multi-stage flows/procedures instead of rebuilding parallel speech or conversation infrastructure.

### 2.4 Claude owns multimodal perception/reasoning

Claude is used for:

- screenshot/frame understanding;
- semantic ScreenEvent extraction;
- Work Map synthesis;
- semantic evaluation/explanation for cases that are not deterministically covered.

### 2.5 Backend owns critical authorization

The backend evaluator is the authority for whether a training decision may be saved.

The client must never:

```text
save decision → ask evaluator afterward
```

It must instead:

```text
decision attempt → backend evaluator → allowSave → save only when allowed
```

Voice output is coaching only. Voice state must never determine whether a decision is saved.

### 2.6 Deterministic checks come first

Known safety-critical workflow rules are evaluated deterministically before semantic Claude evaluation.

A Claude outage, ElevenLabs outage, or disconnected voice session must not make a known unsafe decision savable.

### 2.7 Privacy boundary

PII should be redacted before data is sent to third-party model providers when the privacy layer is enabled/required. Presidio belongs in the backend/provider boundary, not in the shared domain model.

---

## 3. Ownership Boundaries

### Person 1 — Frontend / Product / Workflow UI

Owns:

- Support Triage interface;
- ticket queue and active ticket UI;
- browser screen-capture UX and capture state;
- current workflow state and user selections;
- Work Map presentation;
- training UI and Save button behavior;
- trainee retry flow;
- forwarding the relevant provider-neutral context to the backend/agent adapters.

Person 1 must not implement a second decision-authority layer that can disagree with the backend evaluator.

### Person 2 — ElevenLabs / Conversation

Owns:

- interviewer agent;
- conversational turn-taking;
- targeted capture questions;
- debrief flow;
- teach-back flow;
- tutor voice guidance;
- ElevenLabs Web SDK/Widget integration;
- Dynamic Variables / Client Tools / Webhooks;
- conversation analysis/data collection where used.

Person 2 should consume `ScreenEvent`, `WorkMap`, and `TutorIntervention` through provider-neutral boundaries.

### Person 3 — Vision / Reasoning / Backend

Owns:

- Claude provider adapter;
- screenshot → semantic `ScreenEvent` extraction;
- event normalization/deduplication;
- session/event/answer/work-map persistence;
- Work Map synthesis and validation;
- evidence linking;
- deterministic evaluation;
- semantic evaluation fallback;
- Save/Block authority;
- privacy/redaction boundary;
- training-result persistence;
- backend API contracts.

---

## 4. Canonical Shared Domain Types

The following names and value sets are canonical. `shared/types.ts` must remain aligned with them.

### 4.1 Ticket

```ts
export type TicketPriority = "P1" | "P2" | "P3";

export type TicketTeam = "Infrastructure" | "Support" | "Engineering";

export type TicketAction =
  | "Immediate escalation"
  | "Normal troubleshooting"
  | "STOP normal processing + escalate"
  | "Send reset procedure"
  | "Investigate performance";

export interface Ticket {
  id: string;
  customer: string;
  issue: string;
  scope: string;
  priority: TicketPriority;
  team: TicketTeam;
  action: TicketAction;
  expertReasoning?: string;
  status?: "open" | "in_progress" | "resolved" | "closed";
  createdAt?: string;
  updatedAt?: string;
}
```

`Ticket` expected outcomes belong to the canonical workflow data (`shared/demo-tickets.json` / `WORKFLOW.md`). Do not create a second, contradictory source of truth in evaluator code.

### 4.2 Session

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

Session semantics:

- expert session normally begins in `capturing`;
- training session normally begins in `training`;
- ending an expert capture normally moves to `debrief`;
- ending a training session normally moves to `completed`;
- Work Map generation moves the expert session to `map_ready`.

### 4.3 ScreenEvent

```ts
export type ScreenEventType =
  | "ticket_opened"
  | "field_changed"
  | "priority_changed"
  | "team_changed"
  | "action_changed"
  | "decision_saved";

export type ScreenEventSource = "vision" | "workflow_state" | "hybrid";

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

Meaningful events only. Cursor motion, repeated identical frames, and pixel-level changes are not ScreenEvents unless they cause a meaningful workflow transition.

### 4.4 ExpertAnswer

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

Answers should be linked to the event(s) they explain whenever such linkage is known.

### 4.5 WorkMap

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

A Work Map is valid only when it is traceable to the capture evidence and expert explanations. `sourceEventIds`, `screenshotRef`, and `expertQuote` are evidence links, not decorative metadata.

Teach-back confirmation is represented by `confirmedByExpert`/`confirmedAt` on the stored Work Map. The generation input carries the confirmation signal.

### 4.6 WorkMap generation input

```ts
export interface WorkMapGenerationInput {
  session: Session;
  screenEvents: ScreenEvent[];
  expertAnswers: ExpertAnswer[];
  workflowName: "Support Ticket Triage";
  teachBackConfirmed?: boolean;
}
```

The backend may accept a convenience request containing `sessionId` and load stored events/answers, or accept the complete input directly. Either path must produce the same semantic Work Map.

### 4.7 DecisionAttempt

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

The fields are optional at the transport/model level so the UI can represent an incomplete draft. However:

> **When `submitted === true`, priority, team, and action are required for evaluation. Missing required fields must not be treated as a correct decision.**

### 4.8 TutorIntervention

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

`message` is user-facing and safe to expose to the trainee.

`reason` is explanatory content derived from the learned workflow; it must not contain raw provider exceptions, stack traces, or secrets.

### 4.9 Evaluation result

```ts
export interface DecisionEvaluationResult {
  allowSave: boolean;
  intervention: TutorIntervention | null;
}
```

### 4.10 Training result

```ts
export interface TrainingResult {
  id: string;
  sessionId: string;
  initialDecision: {
    priority?: string;
    team?: string;
    action?: string;
  };
  interventionOccurred: boolean;
  initialDecisionWrong: boolean;
  correctionOccurred: boolean;
  finalDecision: {
    priority?: string;
    team?: string;
    action?: string;
  };
  completed: boolean;
  timestampMs: number;
}
```

### 4.11 Agent messages and capture state

```ts
export type AgentMessageRole = "agent" | "user" | "system";

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

### 4.12 Integration error

```ts
export interface IntegrationError {
  code: string;
  message: string;
  retryable: boolean;
  requestId?: string;
}
```

Provider exceptions must be logged internally and translated to `IntegrationError` at the integration boundary.

---

## 5. Provider Adapter Contracts

### 5.1 VoiceAgentAdapter

The frontend/application layer must not depend directly on ElevenLabs-specific runtime objects.

```ts
export interface VoiceAgentAdapter {
  connect(input: {
    sessionId: string;
    mode: "interviewer" | "tutor";
  }): Promise<void>;

  disconnect(): Promise<void>;

  updateContext(context: Record<string, unknown>): Promise<void>;

  sendScreenEvent(event: ScreenEvent): Promise<void>;

  sendWorkMap(workMap: WorkMap): Promise<void>;

  sendIntervention(intervention: TutorIntervention): Promise<void>;

  onMessage(callback: (message: AgentMessage) => void): () => void;

  onStatusChange(callback: (status: string) => void): () => void;
}
```

### 5.2 VisionAdapter

```ts
export interface VisionAdapter {
  analyzeFrame(input: {
    sessionId: string;
    timestampMs: number;
    image: Blob | ImageBitmap;
    priorEvent?: ScreenEvent;
    workflowContext?: Record<string, unknown>;
  }): Promise<ScreenEvent | null>;
}
```

The adapter returns provider-neutral `ScreenEvent` data, not raw Claude output.

### 5.3 EvaluationAdapter

```ts
export interface EvaluationAdapter {
  evaluate(
    attempt: DecisionAttempt,
    workMap: WorkMap
  ): Promise<DecisionEvaluationResult>;
}
```

---

## 6. Backend API Contract

### 6.1 Session APIs

| Method | Endpoint | Request | Response |
|---|---|---|---|
| `POST` | `/api/sessions` | `SessionCreate` | `Session` |
| `GET` | `/api/sessions/:sessionId` | — | `Session` |
| `POST` | `/api/sessions/:sessionId/end` | optional `{ phase?, endedAt? }` | `Session` |
| `GET` | `/api/sessions/:sessionId/events` | — | `ScreenEvent[]` |
| `GET` | `/api/sessions/:sessionId/answers` | — | `ExpertAnswer[]` |

`POST /api/sessions` should return HTTP `201` on creation.

### 6.2 Screen-event APIs

| Method | Endpoint | Request | Response |
|---|---|---|---|
| `POST` | `/api/screen-events` | `ScreenEvent` or `ScreenEvent[]` | `{ count: number; inserted: number }` |

The backend assigns an ID when one is not supplied. Duplicate IDs are idempotently ignored rather than creating duplicate events.

### 6.3 Expert-answer APIs

| Method | Endpoint | Request | Response |
|---|---|---|---|
| `POST` | `/api/expert-answers` | `ExpertAnswer` or `ExpertAnswer[]` | `{ count: number; inserted: number }` |

The backend assigns an ID when one is not supplied. Duplicate IDs are idempotently ignored.

### 6.4 Vision API

The perception pipeline must expose a provider-neutral route/service boundary:

| Method | Endpoint | Request | Response |
|---|---|---|---|
| `POST` | `/api/vision/analyze-frame` | `VisionAnalyzeFrameRequest` | `ScreenEvent` or `null` |

Canonical request shape:

```ts
export interface VisionAnalyzeFrameRequest {
  sessionId: string;
  timestampMs: number;
  imageBase64: string;
  screenshotRef?: string;
  previousContext?: string;
  mediaType?: string;
}
```

The route must perform:

```text
base64 image
  ↓
privacy boundary
  ↓
Claude Vision adapter
  ↓
JSON parsing + validation
  ↓
event normalization/deduplication
  ↓
ScreenEvent persistence when an event exists
```

Raw Claude JSON must not be returned as the public contract.

### 6.5 Work Map APIs

| Method | Endpoint | Request | Response |
|---|---|---|---|
| `POST` | `/api/work-maps/generate` | Work Map generation request | `WorkMap` |
| `GET` | `/api/work-maps/:workMapId` | — | `WorkMap` |

Generation must incorporate:

```text
stored/live Session
+ ScreenEvents
+ ExpertAnswers
+ teachBackConfirmed
→ validated WorkMap
```

When `teachBackConfirmed === true`, the persisted Work Map must reflect `confirmedByExpert === true` and set `confirmedAt`.

### 6.6 Training APIs

| Method | Endpoint | Request | Response |
|---|---|---|---|
| `POST` | `/api/training/decision-attempt` | `DecisionAttempt` | `DecisionEvaluationResult` |
| `POST` | `/api/training/results` | `TrainingResult` | `TrainingResult` |
| `GET` | `/api/training/results/:sessionId` | — | `TrainingResult` |

The decision-attempt endpoint is the Save/Block authority.

The backend should persist the attempt and its evaluation outcome for auditability, regardless of whether the save is allowed.

---

## 7. Decision Evaluation Semantics

### 7.1 Required evaluation order

```text
DecisionAttempt
   ↓
validate submission completeness
   ↓
deterministic rules
   ↓
if unresolved → semantic evaluator
   ↓
DecisionEvaluationResult
```

### 7.2 Submission completeness

For `submitted === true`:

```text
priority missing → reject/block
team missing     → reject/block
action missing   → reject/block
```

Missing fields must never be interpreted as wildcards or "not specified, therefore okay".

### 7.3 Known deterministic rules

Known ticket cases use the canonical expectations from `WORKFLOW.md` / `shared/demo-tickets.json`.

For a known case, all three decision fields must match the canonical expected decision before `allowSave` can be `true`.

### 7.4 Data-loss guardrail

Possible data loss is a critical stop condition.

```text
possible data loss
    ↓
priority = P1
team = Engineering
action = STOP normal processing + escalate
```

Any submitted decision that does not satisfy the required stop-and-escalate action must be blocked.

This check must remain deterministic and must run before semantic evaluation.

### 7.5 Semantic evaluation

Claude may evaluate cases where deterministic rules are insufficient or where natural-language context must be interpreted.

A semantic-provider failure must fail safely for a save-authorizing path. The raw provider exception must never be shown as the trainee's `reason` or `message`.

Recommended user-facing fallback:

```text
"I couldn't verify this decision right now, so the save is blocked. Please retry."
```

Internal logs may contain the real provider error.

### 7.6 Correct decision

```text
correct decision
→ allowSave = true
→ intervention = null
```

### 7.7 Wrong decision

```text
wrong decision
→ allowSave = false
→ intervention != null
```

The intervention should include the relevant guardrail and expert evidence when available.

---

## 8. Tutor Intervention Contract

A critical intervention is appropriate for a safety guardrail violation such as possible data loss.

A warning intervention is appropriate for an ordinary incorrect triage decision.

The intervention should communicate three things:

```text
1. What the trainee attempted
2. Why it is wrong
3. What rule/guardrail to apply instead
```

When Work Map evidence exists, `expertEvidence` should point to the source step and timestamp, optionally with its screenshot reference.

ElevenLabs may turn the structured intervention into a natural spoken response, but the structured backend intervention remains the canonical truth.

---

## 9. Work Map Requirements

A generated Work Map must contain, at minimum, for each meaningful learned step:

- observed action;
- decision;
- expert reason;
- guardrails;
- exceptions;
- teaching point;
- traceable source event(s) and/or screenshot evidence when available.

The synthesis pipeline should prefer expert answers over speculative model reasoning when they directly explain the event.

The Work Map must not invent unsupported rules. When evidence is insufficient, the system should preserve the uncertainty rather than fabricate an explanation.

The final Work Map is only considered usable for training after expert teach-back confirmation.

---

## 10. Capture and Conversational Contract

### 10.1 Capture behavior

The expert can:

```text
start → active → paused/resumed → stopped
```

The capture UI owns recorder state. The backend owns persisted semantic events.

### 10.2 Interviewer behavior

The interviewer should ask targeted questions around meaningful decisions, especially:

- why a priority was chosen;
- why the issue was routed to a particular team;
- why escalation was or was not triggered;
- what exception would change the decision;
- when a stop condition applies.

The MVP requires at least three useful live questions, including at least one guardrail-focused question.

Questions should not be generated merely because a frame arrived.

### 10.3 Debrief and teach-back

The debrief closes knowledge gaps and explicitly checks the guardrails/exceptions learned from the expert.

The expert then confirms or corrects the synthesized understanding. The confirmation signal is carried into Work Map generation and persisted on the Work Map.

---

## 11. Event Integrity, Ordering, and Idempotency

Events are ordered by `timestampMs` within a session.

The backend should tolerate repeated submissions from the browser or adapter layer.

The required invariant is:

```text
same event ID submitted twice
→ one persisted event
```

The same principle applies to expert answers and decision attempts.

Events and answers must belong to a valid session. Unknown session IDs should produce a structured integration error rather than silently creating orphan data.

---

## 12. Error Contract

At API boundaries, return a structured error conceptually equivalent to:

```json
{
  "error": {
    "code": "INTEGRATION_ERROR_CODE",
    "message": "Human-readable safe message",
    "retryable": true,
    "requestId": "optional-request-id"
  }
}
```

Rules:

- never expose API keys;
- never expose stack traces in user-facing responses;
- never expose raw Claude/ElevenLabs provider payloads to the UI unless explicitly required by a debugging surface;
- distinguish retryable provider failures from invalid requests and not-found resources.

---

## 13. Canonical Demo Cases

These are the controlled support-triage outcomes used for the hackathon demo.

| Ticket | Priority | Team | Action |
|---|---|---|---|
| `T001` | `P1` | `Infrastructure` | `Immediate escalation` |
| `T002` | `P3` | `Support` | `Normal troubleshooting` |
| `T003` | `P1` | `Engineering` | `STOP normal processing + escalate` |
| `T004` | `P3` | `Support` | `Send reset procedure` |
| `T005` | `P1` | `Engineering` | `Immediate escalation` |
| `T006` | `P2` | `Engineering` | `Investigate performance` |

### Unseen training case

`T_NEW_01`:

```text
12 customers lost transaction history after an update.
```

Expected outcome:

```text
P1 + Engineering + STOP normal processing + escalate
```

A representative trainee mistake is:

```text
P3 + Support + Normal troubleshooting
```

That mistake must be blocked and must trigger a critical intervention explaining the possible-data-loss guardrail.

---

## 14. Canonical Golden-Path Acceptance Test

The MVP is considered integration-complete only when this end-to-end path works:

```text
1. Create expert session
2. Capture meaningful screen events
3. Send events to interviewer context
4. Persist at least 3 expert answers
5. End expert session → debrief
6. Complete debrief + teach-back confirmation
7. Generate WorkMap
8. Validate and persist WorkMap
9. Create training session
10. Present unseen case T_NEW_01
11. Submit unsafe trainee decision
12. Backend returns allowSave = false
13. Critical TutorIntervention returned
14. Unsafe decision is not persisted as a successful save
15. Trainee corrects decision
16. Backend returns allowSave = true
17. Corrected decision can be saved
18. TrainingResult persists final outcome
```

The most important resilience test is:

```text
ElevenLabs disconnected
      ↓
backend deterministic evaluation still runs
      ↓
unsafe save remains blocked
```

Likewise:

```text
Claude semantic path unavailable
      ↓
known deterministic safety rules still run
```

---

## 15. Repository Source-of-Truth Rules

The shared repository uses these documentation roles:

| File | Role |
|---|---|
| `CONTEXT.md` | Stable product/challenge context |
| `ARCHITECTURE.md` | System architecture and component boundaries |
| `WORKFLOW.md` | Canonical support-triage workflow and expected cases |
| `INTEGRATION.md` | Provider and integration behavior |
| `CONTRACTS.md` | **Final shared implementation contracts** |
| `shared/types.ts` | **Canonical machine-readable shared interfaces** |
| `shared/demo-tickets.json` | **Canonical deterministic demo ticket data** |

Before changing a cross-person interface, update this contract and `shared/types.ts` together.

### Forbidden drift

Do not:

- introduce a second ticket-action spelling;
- create evaluator rules that contradict `shared/demo-tickets.json`;
- create a second Save/Block mechanism in the frontend or voice agent;
- pass raw provider-specific objects across team boundaries;
- let a disconnected voice agent determine authorization;
- show raw model/provider exceptions to trainees.

---

## 16. Final Implementation Notes

The current repository should treat this document as the replacement for the older `CONTRACTS.md`.

Before declaring the contract implemented, the codebase must also resolve any remaining mismatches between this document and implementation, especially:

1. the vision frame → `ScreenEvent` API/service boundary;
2. required-field validation for submitted decisions;
3. one canonical spelling for the data-loss action (`STOP normal processing + escalate`);
4. clean user-facing semantic-evaluation fallback messages;
5. persistence of teach-back confirmation;
6. removal of generated Python bytecode/database artifacts from source control.

Legacy invoice/spreadsheet/TK-1042 contracts are out of scope for this MVP and must not reappear in implementation-facing modules.
