/**
 * P1-18 — Mock Integration Layer
 * Mock implementations of ApprenticeApi, VoiceAgentAdapter, etc.
 * All mocks implement the same contracts as live services.
 */

import type {
  Session,
  SessionPhase,
  WorkMap,
  WorkMapStep,
  DecisionAttempt,
  DecisionEvaluationResult,
  TutorIntervention,
  TrainingResult,
  ScreenEvent,
  AgentMessage,
} from "../types/index";

// ---------------------------------------------------------------------------
// Adapter interfaces (provider-neutral)
// ---------------------------------------------------------------------------

export interface ApprenticeApi {
  createSession(opts: { mode: "expert" | "training"; expertName?: string; traineeName?: string }): Promise<Session>;
  endSession(sessionId: string, phase?: SessionPhase): Promise<Session>;
  generateWorkMap(sessionId: string): Promise<WorkMap>;
  evaluateDecision(attempt: DecisionAttempt, workMap: WorkMap): Promise<DecisionEvaluationResult>;
  saveTrainingResult(result: TrainingResult): Promise<TrainingResult>;
}

export type { VoiceAgentAdapter } from "../adapters/voiceAgentAdapter";
export { MockVoiceAgentAdapter } from "../adapters/voiceAgentAdapter";
import { MockVoiceAgentAdapter } from "../adapters/voiceAgentAdapter";

// Re-export TrainingResult here so callers can import it from this file
export type { TrainingResult };

// ---------------------------------------------------------------------------
// ID helpers
// ---------------------------------------------------------------------------
let _seq = 1;
function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${_seq++}`;
}

// ---------------------------------------------------------------------------
// MockApprenticeApi
// ---------------------------------------------------------------------------

const MOCK_WORK_MAP: WorkMap = {
  id: "wm_mock_001",
  sessionId: "session_mock_001",
  workflowName: "Support Ticket Triage",
  expertName: "Jane Expert",
  durationSeconds: 120,
  confirmedByExpert: true,
  confirmedAt: new Date().toISOString(),
  summary:
    "Expert demonstrated scope-first triage across five tickets, surfacing the data-loss guardrail and multi-customer escalation logic.",
  guardrails: [
    "Possible data loss → STOP normal processing + escalate.",
    "Full outage → escalate immediately.",
    "Multi-customer API failure → treat as systemic incident.",
  ],
  exceptions: [
    "Single-user login issues are routine unless wider impact emerges.",
    "Slow performance for one customer differs from slow performance for many.",
  ],
  steps: [
    {
      id: "step_001",
      stepNumber: 1,
      timestampMs: 8000,
      ticketId: "T001",
      observedAction: "Opened T001 — Production website down (All customers)",
      decision: "P1 · Infrastructure · Immediate escalation",
      expertReason:
        "The whole production site is down, so it is P1.",
      guardrails: ["Full outage affects everyone → P1 and immediate escalation."],
      exceptions: [],
      teachingPoint: "P1 is driven by impact, not just the wording of the complaint.",
      expertQuote:
        "I first check whether one customer or everyone is affected.",
      screenshotRef: "screenshot_t001_p1.png",
      sourceEventIds: ["evt_001", "evt_002"],
    },
    {
      id: "step_002",
      stepNumber: 2,
      timestampMs: 33000,
      ticketId: "T002",
      observedAction: "Opened T002 — One employee cannot log in (Single user)",
      decision: "P3 · Support · Normal troubleshooting",
      expertReason:
        "Only one person is affected, so I start normal troubleshooting.",
      guardrails: ["Do not escalate a single-user issue without wider impact."],
      exceptions: [
        "If other users are later affected, re-evaluate immediately.",
      ],
      teachingPoint: "Check whether the issue is isolated.",
      expertQuote: "Single user? Routine troubleshooting.",
      sourceEventIds: ["evt_005", "evt_006"],
    },
    {
      id: "step_003",
      stepNumber: 3,
      timestampMs: 50000,
      ticketId: "T003",
      observedAction:
        "Opened T003 — Customer data disappeared after update (Potential data loss)",
      decision: "P1 · Engineering · STOP normal processing + escalate",
      expertReason:
        "Missing customer data can become worse if we ask them to change or retry things.",
      guardrails: ["Possible data loss → STOP normal processing and escalate."],
      exceptions: [],
      teachingPoint: "Protect evidence/data before troubleshooting.",
      expertQuote:
        "Possible data loss means we stop and escalate. We don't ask the customer to modify or retry data.",
      screenshotRef: "screenshot_t003_stop.png",
      sourceEventIds: ["evt_007", "evt_008", "evt_009"],
    },
    {
      id: "step_004",
      stepNumber: 4,
      timestampMs: 80000,
      ticketId: "T005",
      observedAction:
        "Opened T005 — API returning errors for many customers (Multiple customers)",
      decision: "P1 · Engineering · Immediate escalation",
      expertReason:
        "Many customers seeing API errors means it is probably systemic.",
      guardrails: ["Multi-customer API failure → incident handling."],
      exceptions: [],
      teachingPoint: "Use scope to distinguish local vs systemic issues.",
      expertQuote:
        "Multiple customers seeing the same API error indicates a systemic incident.",
      sourceEventIds: ["evt_011", "evt_012"],
    },
    {
      id: "step_005",
      stepNumber: 5,
      timestampMs: 90000,
      ticketId: "T006",
      observedAction:
        "Opened T006 — Dashboard slow for several customers (Multiple customers)",
      decision: "P2 · Engineering · Investigate performance",
      expertReason:
        "Slow for several customers is a performance problem, not just one user's browser.",
      guardrails: ["Multiple reports → investigate system-wide impact."],
      exceptions: ["Single slow customer is usually local; multiple is systemic."],
      teachingPoint: "Repeated reports change the severity.",
      expertQuote:
        "Several customers with performance issues indicate a broader performance problem.",
      sourceEventIds: ["evt_013", "evt_014"],
    },
  ] as WorkMapStep[],
};

export class MockApprenticeApi implements ApprenticeApi {
  private sessions = new Map<string, Session>();

  async createSession(opts: {
    mode: "expert" | "training";
    expertName?: string;
    traineeName?: string;
  }): Promise<Session> {
    const session: Session = {
      id: uid("session"),
      mode: opts.mode,
      phase: opts.mode === "expert" ? "capturing" : "training",
      workflowName: "Support Ticket Triage",
      startedAt: new Date().toISOString(),
      expertName: opts.expertName ?? "Expert",
      traineeName: opts.traineeName,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async endSession(sessionId: string, phase?: SessionPhase): Promise<Session> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    const updated = { ...session, phase: phase ?? "debrief", endedAt: new Date().toISOString() };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  async generateWorkMap(sessionId: string): Promise<WorkMap> {
    // Simulate async generation delay
    await new Promise((r) => setTimeout(r, 1500));
    return { ...MOCK_WORK_MAP, sessionId, id: uid("wm") };
  }

  async evaluateDecision(
    attempt: DecisionAttempt,
    _workMap: WorkMap,
  ): Promise<DecisionEvaluationResult> {
    await new Promise((r) => setTimeout(r, 400));

    // Deterministic data-loss guardrail check for T007 (training case)
    if (attempt.ticketId === "T007") {
      const isCorrect =
        attempt.priority === "P1" &&
        attempt.team === "Engineering" &&
        attempt.action === "STOP normal processing + escalate";

      if (!isCorrect) {
        const intervention: TutorIntervention = {
          ticketId: attempt.ticketId,
          attemptedDecision: {
            priority: attempt.priority,
            team: attempt.team,
            action: attempt.action,
          },
          correct: false,
          severity: "critical",
          message:
            "This case involves possible data loss. The expert rule is: STOP normal processing and escalate to Engineering immediately.",
          reason:
            "Possible data loss is a stop-and-escalate case. Asking the customer to modify or retry data could destroy evidence.",
          guardrail:
            "Possible data loss → STOP normal processing + escalate.",
          expertEvidence: {
            workMapStepId: "step_003",
            timestampMs: 50000,
            screenshotRef: "screenshot_t003_stop.png",
          },
        };
        return { allowSave: false, intervention };
      }
    }

    return { allowSave: true, intervention: null };
  }

  async saveTrainingResult(result: TrainingResult): Promise<TrainingResult> {
    await new Promise((r) => setTimeout(r, 200));
    return result;
  }
}

// ---------------------------------------------------------------------------
// Singleton instances
// ---------------------------------------------------------------------------

export const mockApi = new MockApprenticeApi();
export const mockVoiceAgent = new MockVoiceAgentAdapter();
