/**
 * Canonical shared types — re-exported from shared/types.ts.
 * All frontend modules should import types from here.
 */
export type {
  Ticket,
  TicketPriority,
  TicketTeam,
  TicketAction,
  Session,
  SessionMode,
  SessionPhase,
  ScreenEvent,
  ScreenEventType,
  ScreenEventSource,
  ExpertAnswer,
  AnswerPhase,
  WorkMap,
  WorkMapStep,
  WorkMapGenerationInput,
  DecisionAttempt,
  TutorIntervention,
  DecisionEvaluationResult,
  AgentMessage,
  AgentMessageRole,
  AgentMessageKind,
  CaptureState,
  CaptureStatus,
  IntegrationError,
  TrainingResult,
} from "../../../shared/types";
