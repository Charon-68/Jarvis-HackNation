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
    "Expert demonstrated scope-first triage across production outage, payroll, and data-loss incidents, applying safety guardrails.",
  guardrails: [
    "Possible data loss → Escalate Immediately.",
    "Full outage → Escalate Immediately to Operations.",
    "Payroll calculation failure → Investigate & Resolve with Accounting.",
  ],
  exceptions: [
    "Routine access requests follow standard procedure.",
    "Single customer slowness differs from systemic API outage.",
  ],
  steps: [
    {
      id: "step_001",
      stepNumber: 1,
      timestampMs: 8000,
      ticketId: "T001",
      observedAction: "Opened T001 — Production website down (All customers)",
      decision: "Emergency · Operations · Escalate Immediately",
      expertReason:
        "The whole production site is down, requiring Emergency escalation to Operations.",
      guardrails: ["Full production outage affects everyone → Emergency and Escalate Immediately."],
      exceptions: [],
      teachingPoint: "Priority is driven by scope and business impact.",
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
      observedAction: "Opened T002 — Monthly payroll calculation failing",
      decision: "Emergency · Accounting · Investigate & Resolve",
      expertReason:
        "Company-wide payroll failure requires urgent technical investigation by Accounting.",
      guardrails: ["Payroll processing block -> Emergency priority."],
      exceptions: [],
      teachingPoint: "Financial disbursement issues are critical business risks.",
      expertQuote: "Payroll calculation block requires immediate investigation.",
      sourceEventIds: ["evt_005", "evt_006"],
    },
    {
      id: "step_003",
      stepNumber: 3,
      timestampMs: 50000,
      ticketId: "T003",
      observedAction:
        "Opened T003 — Customer data disappeared after update (Potential data loss)",
      decision: "Emergency · Engineering · Escalate Immediately",
      expertReason:
        "Missing customer data can become worse if we ask them to change or retry things.",
      guardrails: ["Possible data loss → Escalate Immediately."],
      exceptions: [],
      teachingPoint: "Protect evidence/data before troubleshooting.",
      expertQuote:
        "Possible data loss means we stop normal processing and escalate immediately.",
      screenshotRef: "screenshot_t003_stop.png",
      sourceEventIds: ["evt_007", "evt_008", "evt_009"],
    },
    {
      id: "step_004",
      stepNumber: 4,
      timestampMs: 80000,
      ticketId: "T004",
      observedAction:
        "Opened T004 — Dashboard slowness for multiple teams",
      decision: "Moderate · Engineering · Investigate & Resolve",
      expertReason:
        "Multiple users seeing dashboard slowness indicates a systemic performance issue.",
      guardrails: ["Multi-user slowness → Investigate & Resolve."],
      exceptions: [],
      teachingPoint: "Use scope to distinguish local vs systemic issues.",
      expertQuote:
        "Multiple users seeing dashboard slowness indicates a systemic performance issue.",
      sourceEventIds: ["evt_011", "evt_012"],
    },
    {
      id: "step_005",
      stepNumber: 5,
      timestampMs: 90000,
      ticketId: "T005",
      observedAction:
        "Opened T005 — New hire access permissions incomplete",
      decision: "Moderate · HR · Follow Standard Procedure",
      expertReason:
        "HR onboarding access provisioning follows established standard procedures.",
      guardrails: ["Follow standard HR provisioning workflow."],
      exceptions: [],
      teachingPoint: "Routine onboarding requests follow standard procedure.",
      expertQuote:
        "Role-based access follows established HR procedures.",
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

    // Deterministic data-loss guardrail check for T007 / T_NEW_01 (training case)
    if (attempt.ticketId === "T007" || attempt.ticketId === "T_NEW_01") {
      const isCorrect =
        attempt.priority === "Emergency" &&
        attempt.team === "Engineering" &&
        attempt.action === "Escalate Immediately";

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
            "This case involves possible data loss. The expert rule is: Emergency priority, Engineering team, and Escalate Immediately.",
          reason:
            "Possible data loss is a critical safety guardrail. Asking the customer to modify or retry data could destroy evidence.",
          guardrail:
            "Possible data loss → Emergency · Engineering · Escalate Immediately.",
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
