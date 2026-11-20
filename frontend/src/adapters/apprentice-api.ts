/**
 * P1-17 — Live Apprentice API Adapter
 * Connects frontend to backend REST endpoints:
 *   - POST /api/sessions
 *   - POST /api/sessions/:sessionId/end
 *   - POST /api/screen-events
 *   - POST /api/expert-answers
 *   - POST /api/work-maps/generate
 *   - GET /api/work-maps/:workMapId
 *   - POST /api/training/decision-attempt
 *   - POST /api/training/results
 *
 * Uses VITE_API_URL or defaults to relative '/api'.
 */

import type {
  Session,
  SessionPhase,
  WorkMap,
  DecisionAttempt,
  DecisionEvaluationResult,
  TrainingResult,
  ScreenEvent,
  ExpertAnswer,
  IntegrationError,
} from "../types/index";

import type { ApprenticeApi } from "../mocks/mockServices";

export class HttpApprenticeApi implements ApprenticeApi {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // Priority: parameter > import.meta.env.VITE_API_URL > empty string (relative)
    this.baseUrl = (
      baseUrl ??
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ??
      ""
    ).replace(/\/$/, "");
  }

  /**
   * A sleeping backend (e.g. a Render free-tier cold start) can hold a request
   * open for 30 s+. Abort after `timeoutMs` so HybridApprenticeApi can fall
   * back to the mock API instead of leaving the UI stuck on "Starting…".
   * Generation endpoints get a longer budget because they call an LLM.
   */
  private async request<T>(path: string, options?: RequestInit, timeoutMs = 6000): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorDetails = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson.message) errorDetails = errJson.message;
        } catch {
          // Non-JSON response body
        }

        const integrationErr: IntegrationError = {
          code: `HTTP_${response.status}`,
          message: errorDetails,
          retryable: response.status >= 500,
        };
        throw new Error(`[ApprenticeApi Error] ${integrationErr.message}`);
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      if ((err as Error).message.startsWith("[ApprenticeApi Error]")) {
        throw err;
      }
      const reason = controller.signal.aborted ? `timed out after ${timeoutMs} ms` : (err as Error).message;
      throw new Error(`Network error communicating with backend: ${reason}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async createSession(opts: {
    mode: "expert" | "training";
    expertName?: string;
    traineeName?: string;
  }): Promise<Session> {
    return this.request<Session>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(opts),
    });
  }

  async endSession(sessionId: string, phase?: SessionPhase): Promise<Session> {
    return this.request<Session>(`/api/sessions/${encodeURIComponent(sessionId)}/end`, {
      method: "POST",
      body: JSON.stringify({ phase }),
    });
  }

  async sendScreenEvents(events: ScreenEvent | ScreenEvent[]): Promise<{ count: number; inserted: number }> {
    return this.request<{ count: number; inserted: number }>("/api/screen-events", {
      method: "POST",
      body: JSON.stringify(events),
    });
  }

  async sendExpertAnswers(answers: ExpertAnswer | ExpertAnswer[]): Promise<{ count: number; inserted: number }> {
    return this.request<{ count: number; inserted: number }>("/api/expert-answers", {
      method: "POST",
      body: JSON.stringify(answers),
    });
  }

  async generateWorkMap(sessionId: string): Promise<WorkMap> {
    return this.request<WorkMap>("/api/work-maps/generate", {
      method: "POST",
      body: JSON.stringify({ sessionId, workflowName: "Support Ticket Triage" }),
    }, 30000);
  }

  async getWorkMap(workMapId: string): Promise<WorkMap> {
    return this.request<WorkMap>(`/api/work-maps/${encodeURIComponent(workMapId)}`, {
      method: "GET",
    });
  }

  async evaluateDecision(attempt: DecisionAttempt, _workMap: WorkMap): Promise<DecisionEvaluationResult> {
    return this.request<DecisionEvaluationResult>("/api/training/decision-attempt", {
      method: "POST",
      body: JSON.stringify(attempt),
    }, 30000);
  }

  async saveTrainingResult(result: TrainingResult): Promise<TrainingResult> {
    return this.request<TrainingResult>("/api/training/results", {
      method: "POST",
      body: JSON.stringify(result),
    });
  }
}

/**
 * Composite / Fallback ApprenticeApi implementation.
 * Attempts HttpApprenticeApi first; if backend is unreachable or offline,
 * falls back seamlessly to MockApprenticeApi for offline development.
 */
export class HybridApprenticeApi implements ApprenticeApi {
  private httpApi: HttpApprenticeApi;
  private mockApi: ApprenticeApi;
  private useMockOnly: boolean;

  constructor(mockApi: ApprenticeApi, useMockOnly: boolean = false) {
    this.httpApi = new HttpApprenticeApi();
    this.mockApi = mockApi;
    this.useMockOnly = useMockOnly;
  }

  async createSession(opts: {
    mode: "expert" | "training";
    expertName?: string;
    traineeName?: string;
  }): Promise<Session> {
    if (this.useMockOnly) return this.mockApi.createSession(opts);
    try {
      return await this.httpApi.createSession(opts);
    } catch {
      console.warn("Backend unavailable; using MockApprenticeApi fallback.");
      return this.mockApi.createSession(opts);
    }
  }

  async endSession(sessionId: string, phase?: SessionPhase): Promise<Session> {
    if (this.useMockOnly) return this.mockApi.endSession(sessionId, phase);
    try {
      return await this.httpApi.endSession(sessionId, phase);
    } catch {
      return this.mockApi.endSession(sessionId, phase);
    }
  }

  async generateWorkMap(sessionId: string): Promise<WorkMap> {
    if (this.useMockOnly) return this.mockApi.generateWorkMap(sessionId);
    try {
      return await this.httpApi.generateWorkMap(sessionId);
    } catch {
      return this.mockApi.generateWorkMap(sessionId);
    }
  }

  async evaluateDecision(attempt: DecisionAttempt, workMap: WorkMap): Promise<DecisionEvaluationResult> {
    if (this.useMockOnly) return this.mockApi.evaluateDecision(attempt, workMap);
    try {
      return await this.httpApi.evaluateDecision(attempt, workMap);
    } catch {
      return this.mockApi.evaluateDecision(attempt, workMap);
    }
  }

  async saveTrainingResult(result: TrainingResult): Promise<TrainingResult> {
    if (this.useMockOnly) return this.mockApi.saveTrainingResult(result);
    try {
      return await this.httpApi.saveTrainingResult(result);
    } catch {
      return this.mockApi.saveTrainingResult(result);
    }
  }
}
