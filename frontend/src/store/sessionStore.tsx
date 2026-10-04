/**
 * P1-01, P1-10 — Session state store
 * Central React context for session phase, mode, and controls.
 */

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import type {
  Session,
  SessionPhase,
  WorkMap,
  AgentMessage,
  ScreenEvent,
  TutorIntervention,
  DecisionEvaluationResult,
} from "../types/index";
import { mockApi } from "../mocks/mockServices";
import { HybridApprenticeApi } from "../adapters/apprentice-api";
import { evidenceStore } from "./evidenceStore";

const apprenticeApi = new HybridApprenticeApi(mockApi);

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface SessionState {
  session: Session | null;
  phase: SessionPhase;
  /** captured / generated work map */
  workMap: WorkMap | null;
  /** agent messages for the side panel */
  agentMessages: AgentMessage[];
  /** screen events generated during capture */
  screenEvents: ScreenEvent[];
  /** last tutor intervention */
  intervention: TutorIntervention | null;
  /** last evaluation result */
  evaluationResult: DecisionEvaluationResult | null;
  /** global loading flag */
  loading: boolean;
  /** error message */
  error: string | null;
  /** capture timer (seconds elapsed) */
  captureElapsed: number;
}

const initialState: SessionState = {
  session: null,
  phase: "ready",
  workMap: null,
  agentMessages: [],
  screenEvents: [],
  intervention: null,
  evaluationResult: null,
  loading: false,
  error: null,
  captureElapsed: 0,
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Action =
  | { type: "SESSION_CREATED"; session: Session }
  | { type: "PHASE_CHANGED"; phase: SessionPhase }
  | { type: "WORK_MAP_READY"; workMap: WorkMap }
  | { type: "AGENT_MESSAGE"; message: AgentMessage }
  | { type: "SCREEN_EVENT"; event: ScreenEvent }
  | { type: "INTERVENTION"; intervention: TutorIntervention | null }
  | { type: "EVALUATION_RESULT"; result: DecisionEvaluationResult | null }
  | { type: "LOADING"; loading: boolean }
  | { type: "ERROR"; error: string | null }
  | { type: "CAPTURE_TICK"; elapsed: number }
  | { type: "RESET" };

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "SESSION_CREATED":
      return { ...state, session: action.session, phase: action.session.phase, error: null };
    case "PHASE_CHANGED":
      return {
        ...state,
        phase: action.phase,
        session: state.session ? { ...state.session, phase: action.phase } : null,
      };
    case "WORK_MAP_READY":
      return { ...state, workMap: action.workMap, phase: "map_ready", loading: false };
    case "AGENT_MESSAGE":
      return { ...state, agentMessages: [...state.agentMessages, action.message] };
    case "SCREEN_EVENT":
      return { ...state, screenEvents: [...state.screenEvents, action.event] };
    case "INTERVENTION":
      return { ...state, intervention: action.intervention };
    case "EVALUATION_RESULT":
      return { ...state, evaluationResult: action.result };
    case "LOADING":
      return { ...state, loading: action.loading };
    case "ERROR":
      return { ...state, error: action.error, loading: false };
    case "CAPTURE_TICK":
      return { ...state, captureElapsed: action.elapsed };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface SessionContextValue {
  state: SessionState;
  // Session lifecycle
  startExpertSession(expertName?: string): Promise<void>;
  startTrainingSession(traineeName?: string): Promise<void>;
  endCapture(): Promise<void>;
  generateWorkMap(): Promise<void>;
  startTraining(): void;
  completeSession(): void;
  resetSession(): void;
  // Event dispatchers
  dispatchAgentMessage(msg: AgentMessage): void;
  dispatchScreenEvent(event: ScreenEvent): void;
  dispatchIntervention(i: TutorIntervention | null): void;
  dispatchEvaluationResult(r: DecisionEvaluationResult | null): void;
  dispatchCaptureElapsed(elapsed: number): void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const startExpertSession = useCallback(async (expertName = "Expert") => {
    evidenceStore.clear();
    dispatch({ type: "LOADING", loading: true });
    try {
      const session = await apprenticeApi.createSession({ mode: "expert", expertName });
      dispatch({ type: "SESSION_CREATED", session });
    } catch (e) {
      dispatch({ type: "ERROR", error: String(e) });
    } finally {
      dispatch({ type: "LOADING", loading: false });
    }
  }, []);

  const startTrainingSession = useCallback(async (traineeName = "Trainee") => {
    dispatch({ type: "LOADING", loading: true });
    try {
      const session = await apprenticeApi.createSession({ mode: "training", traineeName });
      dispatch({ type: "SESSION_CREATED", session });
    } catch (e) {
      dispatch({ type: "ERROR", error: String(e) });
    } finally {
      dispatch({ type: "LOADING", loading: false });
    }
  }, []);

  const endCapture = useCallback(async () => {
    if (!state.session) return;
    dispatch({ type: "PHASE_CHANGED", phase: "debrief" });
    try {
      await apprenticeApi.endSession(state.session.id, "debrief");
    } catch (e) {
      dispatch({ type: "ERROR", error: String(e) });
    }
  }, [state.session]);

  const generateWorkMap = useCallback(async () => {
    if (!state.session) return;
    dispatch({ type: "LOADING", loading: true });
    dispatch({ type: "PHASE_CHANGED", phase: "map_ready" });
    try {
      const workMap = await apprenticeApi.generateWorkMap(state.session.id);
      dispatch({ type: "WORK_MAP_READY", workMap });
    } catch (e) {
      dispatch({ type: "ERROR", error: String(e) });
      dispatch({ type: "PHASE_CHANGED", phase: "error" });
    }
  }, [state.session]);

  const startTraining = useCallback(() => {
    dispatch({ type: "PHASE_CHANGED", phase: "training" });
  }, []);

  const completeSession = useCallback(() => {
    dispatch({ type: "PHASE_CHANGED", phase: "completed" });
  }, []);

  const resetSession = useCallback(() => {
    evidenceStore.clear();
    dispatch({ type: "RESET" });
  }, []);

  const dispatchAgentMessage = useCallback((msg: AgentMessage) => {
    dispatch({ type: "AGENT_MESSAGE", message: msg });
  }, []);

  const dispatchScreenEvent = useCallback((event: ScreenEvent) => {
    dispatch({ type: "SCREEN_EVENT", event });
  }, []);

  const dispatchIntervention = useCallback((i: TutorIntervention | null) => {
    dispatch({ type: "INTERVENTION", intervention: i });
  }, []);

  const dispatchEvaluationResult = useCallback((r: DecisionEvaluationResult | null) => {
    dispatch({ type: "EVALUATION_RESULT", result: r });
  }, []);

  const dispatchCaptureElapsed = useCallback((elapsed: number) => {
    dispatch({ type: "CAPTURE_TICK", elapsed });
  }, []);

  return (
    <SessionContext.Provider
      value={{
        state,
        startExpertSession,
        startTrainingSession,
        endCapture,
        generateWorkMap,
        startTraining,
        completeSession,
        resetSession,
        dispatchAgentMessage,
        dispatchScreenEvent,
        dispatchIntervention,
        dispatchEvaluationResult,
        dispatchCaptureElapsed,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
