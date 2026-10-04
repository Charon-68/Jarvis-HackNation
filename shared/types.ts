/**
 * AI Apprentice — Canonical TypeScript Implementation Contracts
 * Support Ticket Triage Architecture
 */

// ---------------------------------------------------------------------------
// 1. Support Ticket Data Model
// ---------------------------------------------------------------------------

export type TicketPriority = "P1" | "P2" | "P3";

export type TicketTeam = "Infrastructure" | "Support" | "Engineering";

export type TicketAction =
  | "Immediate escalation"
  | "Normal troubleshooting"
  | "STOP normal processing + escalate"
  | "Send reset procedure"
  | "Investigate performance";

export interface Ticket {
  id: string; // e.g. "T001", "T002"
  customer: string; // e.g. "ABC Corp"
  issue: string;
  scope: string; // e.g. "All customers", "Single user", "Potential data loss", "Multiple customers"
  priority: TicketPriority;
  team: TicketTeam;
  action: TicketAction;
  expertReasoning?: string; // Hidden rule / reasoning learned by Apprentice
  status?: "open" | "in_progress" | "resolved" | "closed";
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// 2. Session
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 3. ScreenEvent
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 4. ExpertAnswer
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 5. WorkMapStep & WorkMap
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 6. DecisionAttempt & TutorIntervention
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 7. AgentMessage & CaptureState
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 8. Integration Error
// ---------------------------------------------------------------------------

export interface IntegrationError {
  code: string;
  message: string;
  retryable: boolean;
  requestId?: string;
}
