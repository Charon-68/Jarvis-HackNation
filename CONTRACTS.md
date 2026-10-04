# AI Apprentice — Implementation Contracts

> **Status:** Canonical Implementation Contracts for Support Ticket Triage MVP  
> **Target Architecture:** ElevenLabs × Hack-Nation AI Apprentice — Support Ticket Triage  
> **Product Path:** Capture → Map → Teach  
> **Source of Truth:** Aligned with `INTEGRATION.md`, `WORKFLOW.md`, `ARCHITECTURE.md`, and `shared/types.ts`.

---

## 1. Overview & Architectural Alignment

This document defines the formal contracts governing data exchange between the product components:
- **Person 1 (Frontend / Product UI)**: Support Triage application, capture UI, Work Map UI, and training interface.
- **Person 2 (ElevenLabs / Conversation Layer)**: Interviewer, debrief orchestration, teach-back, and voice tutor interventions.
- **Person 3 (Vision / Reasoning / Backend Layer)**: Claude Vision frame observation, event normalization, Work Map synthesis, deterministic evaluation, and session persistence.

### Core Principles
1. **Application Truth vs. Learned Knowledge**: Workflow state (e.g. ticket fields, current selections) is application truth owned by the web app and evaluator. Learned knowledge (guardrails, reasoning, exceptions) is synthesized into the `WorkMap`.
2. **Provider Neutrality**: Shared contracts do not expose raw Anthropic/Claude API structures or ElevenLabs internal configuration objects.
3. **Save/Block Authority**: The backend evaluator is the authorization boundary for saving triage decisions during training. Unsafe decisions are blocked deterministically.

---

## 2. Canonical Shared TypeScript Interfaces

These interfaces are defined in [`shared/types.ts`](file:///Users/shouryasaxena/Downloads/AIvengers/shared/types.ts).

### 2.1 Support Ticket (`Ticket`)

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
  id: string; // e.g., "T001", "T002", "T003"
  customer: string; // e.g., "ABC Corp"
  issue: string;
  scope: string; // e.g., "All customers", "Single user", "Potential data loss", "Multiple customers"
  priority: TicketPriority;
  team: TicketTeam;
  action: TicketAction;
  expertReasoning?: string; // Hidden reasoning discovered during capture
  status?: "open" | "in_progress" | "resolved" | "closed";
  createdAt?: string;
  updatedAt?: string;
}
```

### 2.2 Session (`Session`)

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

### 2.3 Screen Event (`ScreenEvent`)

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

### 2.4 Expert Answer (`ExpertAnswer`)

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

### 2.5 Work Map & Work Map Step (`WorkMap`, `WorkMapStep`)

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

export interface WorkMapGenerationInput {
  session: Session;
  screenEvents: ScreenEvent[];
  expertAnswers: ExpertAnswer[];
  workflowName: "Support Ticket Triage";
}
```

### 2.6 Decision Attempt & Tutor Intervention (`DecisionAttempt`, `TutorIntervention`)

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

export interface DecisionEvaluationResult {
  allowSave: boolean;
  intervention: TutorIntervention | null;
}
```

### 2.7 Agent Message & Capture State (`AgentMessage`, `CaptureState`)

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

### 2.8 Integration Error (`IntegrationError`)

```ts
export interface IntegrationError {
  code: string;
  message: string;
  retryable: boolean;
  requestId?: string;
}
```

---

## 3. Backend API Surface & Endpoints

| Endpoint | Method | Request Payload | Response Payload | Description |
|---|---|---|---|---|
| `/api/sessions` | `POST` | `Partial<Session>` | `Session` | Initializes an expert or training session |
| `/api/sessions/:sessionId/end` | `POST` | `{}` | `Session` | Transitions session phase to `debrief` or `completed` |
| `/api/screen-events` | `POST` | `ScreenEvent \| ScreenEvent[]` | `{ count: number }` | Appends normalized screen observations |
| `/api/expert-answers` | `POST` | `ExpertAnswer \| ExpertAnswer[]` | `{ count: number }` | Appends expert responses from capture/debrief |
| `/api/work-maps/generate` | `POST` | `WorkMapGenerationInput` | `WorkMap` | Synthesizes verified Work Map using Claude |
| `/api/work-maps/:workMapId` | `GET` | — | `WorkMap` | Fetches a stored Work Map by ID |
| `/api/training/decision-attempt` | `POST` | `DecisionAttempt` | `DecisionEvaluationResult` | Evaluates trainee decision against rules/WorkMap |

---

## 4. Stale Contracts Deprecation Notice

> **Important Notice:** Any prior TK-1042 ticket definitions, invoice/spreadsheet SOP processing structures, or generic un-typed agent responses are obsolete and fully removed. All system modules MUST conform strictly to the Support Ticket Triage contracts defined in this document and [`shared/types.ts`](file:///Users/shouryasaxena/Downloads/AIvengers/shared/types.ts).
