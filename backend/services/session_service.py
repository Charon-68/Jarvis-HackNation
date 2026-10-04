from datetime import datetime, timezone
from typing import List, Optional, Tuple, Union
import uuid

from backend.models.answer import ExpertAnswer
from backend.models.event import ScreenEvent
from backend.models.session import Session, SessionCreate, SessionEndRequest, SessionPhase
from backend.models.training import DecisionAttempt, DecisionEvaluationResult, TrainingResult
from backend.models.workmap import WorkMap, WorkMapGenerateRequest, WorkMapGenerationInput
from backend.storage.repository import SessionNotFoundError, StorageRepository, WorkMapNotFoundError
from evaluation.evaluator import DecisionEvaluator
from workmap.generator import WorkMapGenerator


class SessionService:
    def __init__(self, repo: Optional[StorageRepository] = None):
        self.repo = repo or StorageRepository()

    def create_session(self, payload: SessionCreate) -> Session:
        session_id = payload.id or f"sess_{uuid.uuid4().hex[:12]}"

        phase: SessionPhase = payload.phase or (
            "capturing" if payload.mode == "expert" else "training"
        )

        started_at = payload.startedAt or datetime.now(timezone.utc).isoformat()

        session = Session(
            id=session_id,
            mode=payload.mode,
            phase=phase,
            workflowName=payload.workflowName,
            startedAt=started_at,
            expertName=payload.expertName,
            traineeName=payload.traineeName,
            agentConversationId=payload.agentConversationId,
            workMapId=payload.workMapId,
        )
        return self.repo.create_session(session)

    def end_session(
        self, session_id: str, payload: Optional[SessionEndRequest] = None
    ) -> Session:
        session = self.repo.get_session(session_id)
        if not session:
            raise SessionNotFoundError(session_id)

        target_phase: SessionPhase
        if payload and payload.phase:
            target_phase = payload.phase
        else:
            target_phase = "debrief" if session.mode == "expert" else "completed"

        ended_at = (payload and payload.endedAt) or datetime.now(timezone.utc).isoformat()

        session.phase = target_phase
        session.endedAt = ended_at
        return self.repo.update_session(session)

    def add_screen_events(
        self, events: Union[ScreenEvent, List[ScreenEvent]]
    ) -> Tuple[int, int]:
        event_list = [events] if isinstance(events, ScreenEvent) else events

        for event in event_list:
            if not event.id:
                event.id = f"evt_{uuid.uuid4().hex[:12]}"

        return self.repo.insert_screen_events(event_list)

    def add_expert_answers(
        self, answers: Union[ExpertAnswer, List[ExpertAnswer]]
    ) -> Tuple[int, int]:
        answer_list = [answers] if isinstance(answers, ExpertAnswer) else answers

        for answer in answer_list:
            if not answer.id:
                answer.id = f"ans_{uuid.uuid4().hex[:12]}"

        return self.repo.insert_expert_answers(answer_list)

    def get_session(self, session_id: str) -> Optional[Session]:
        return self.repo.get_session(session_id)

    def get_screen_events(self, session_id: str) -> List[ScreenEvent]:
        return self.repo.get_screen_events(session_id)

    def get_expert_answers(self, session_id: str) -> List[ExpertAnswer]:
        return self.repo.get_expert_answers(session_id)

    def get_decision_attempts(self, session_id: str) -> List[DecisionAttempt]:
        return self.repo.get_decision_attempts(session_id)

    def generate_work_map(
        self,
        request: WorkMapGenerateRequest,
        generator: Optional[WorkMapGenerator] = None,
    ) -> WorkMap:
        session: Optional[Session] = request.session
        events: Optional[List[ScreenEvent]] = request.screenEvents
        answers: Optional[List[ExpertAnswer]] = request.expertAnswers

        if request.sessionId:
            stored_session = self.repo.get_session(request.sessionId)
            if not stored_session:
                raise SessionNotFoundError(request.sessionId)
            if not session:
                session = stored_session
            if events is None:
                events = self.repo.get_screen_events(request.sessionId)
            if answers is None:
                answers = self.repo.get_expert_answers(request.sessionId)

        if not session:
            raise SessionNotFoundError("No valid session or sessionId provided for WorkMap generation.")

        events = events or []
        answers = answers or []

        gen_input = WorkMapGenerationInput(
            session=session,
            screenEvents=events,
            expertAnswers=answers,
            workflowName="Support Ticket Triage",
            teachBackConfirmed=request.teachBackConfirmed,
        )

        work_map_gen = generator or WorkMapGenerator()
        work_map = work_map_gen.generate(gen_input)

        self.repo.save_work_map(work_map)

        session.workMapId = work_map.id
        session.phase = "map_ready"
        self.repo.update_session(session)

        return work_map

    def get_work_map(self, work_map_id: str) -> WorkMap:
        work_map = self.repo.get_work_map(work_map_id)
        if not work_map:
            raise WorkMapNotFoundError(work_map_id)
        return work_map

    def evaluate_decision_attempt(
        self,
        attempt: DecisionAttempt,
        evaluator: Optional[DecisionEvaluator] = None,
    ) -> DecisionEvaluationResult:
        if not attempt.id:
            attempt.id = f"attempt_{uuid.uuid4().hex[:12]}"

        work_map: Optional[WorkMap] = None

        if attempt.sessionId:
            session = self.repo.get_session(attempt.sessionId)
            if session and session.workMapId:
                work_map = self.repo.get_work_map(session.workMapId)

        active_evaluator = evaluator or DecisionEvaluator()
        result = active_evaluator.evaluate(attempt, work_map)

        # Idempotently persist decision attempt + evaluation result
        self.repo.save_decision_attempt(attempt, result)

        return result

    def save_training_result(self, result: TrainingResult) -> TrainingResult:
        return self.repo.save_training_result(result)

    def get_training_result(self, session_id: str) -> Optional[TrainingResult]:
        return self.repo.get_training_result(session_id)
