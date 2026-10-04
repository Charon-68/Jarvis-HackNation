import json
import sqlite3
from typing import List, Optional, Tuple
from backend.models.answer import ExpertAnswer
from backend.models.event import ScreenEvent
from backend.models.session import Session
from backend.models.training import DecisionAttempt, DecisionEvaluationResult, TrainingResult
from backend.models.workmap import WorkMap
from backend.storage.database import get_db_connection


class SessionNotFoundError(Exception):
    def __init__(self, session_id: str):
        self.session_id = session_id
        super().__init__(f"Session with ID '{session_id}' does not exist.")


class WorkMapNotFoundError(Exception):
    def __init__(self, work_map_id: str):
        self.work_map_id = work_map_id
        super().__init__(f"WorkMap with ID '{work_map_id}' does not exist.")


class StorageRepository:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path

    def _get_conn(self) -> sqlite3.Connection:
        return get_db_connection(self.db_path)

    def create_session(self, session: Session) -> Session:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO sessions (
                id, mode, phase, workflow_name, started_at, ended_at,
                expert_name, trainee_name, agent_conversation_id, work_map_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session.id,
                session.mode,
                session.phase,
                session.workflowName,
                session.startedAt,
                session.endedAt,
                session.expertName,
                session.traineeName,
                session.agentConversationId,
                session.workMapId,
            ),
        )
        conn.commit()
        conn.close()
        return session

    def get_session(self, session_id: str) -> Optional[Session]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return Session(
            id=row["id"],
            mode=row["mode"],
            phase=row["phase"],
            workflowName=row["workflow_name"],
            startedAt=row["started_at"],
            endedAt=row["ended_at"],
            expertName=row["expert_name"],
            traineeName=row["trainee_name"],
            agentConversationId=row["agent_conversation_id"],
            workMapId=row["work_map_id"],
        )

    def update_session(self, session: Session) -> Session:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE sessions SET
                mode = ?,
                phase = ?,
                workflow_name = ?,
                started_at = ?,
                ended_at = ?,
                expert_name = ?,
                trainee_name = ?,
                agent_conversation_id = ?,
                work_map_id = ?
            WHERE id = ?
            """,
            (
                session.mode,
                session.phase,
                session.workflowName,
                session.startedAt,
                session.endedAt,
                session.expertName,
                session.traineeName,
                session.agentConversationId,
                session.workMapId,
                session.id,
            ),
        )
        conn.commit()
        conn.close()
        return session

    def insert_screen_events(self, events: List[ScreenEvent]) -> Tuple[int, int]:
        if not events:
            return (0, 0)

        conn = self._get_conn()
        cursor = conn.cursor()

        session_ids = {e.sessionId for e in events}
        for s_id in session_ids:
            cursor.execute("SELECT id FROM sessions WHERE id = ?", (s_id,))
            if not cursor.fetchone():
                conn.close()
                raise SessionNotFoundError(s_id)

        inserted_count = 0
        for event in events:
            cursor.execute(
                """
                INSERT OR IGNORE INTO screen_events (
                    id, session_id, timestamp_ms, ticket_id, type,
                    description, previous_value, new_value, screenshot_ref, source, confidence
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event.id,
                    event.sessionId,
                    event.timestampMs,
                    event.ticketId,
                    event.type,
                    event.description,
                    event.previousValue,
                    event.newValue,
                    event.screenshotRef,
                    event.source,
                    event.confidence,
                ),
            )
            if cursor.rowcount > 0:
                inserted_count += 1

        conn.commit()
        conn.close()
        return (len(events), inserted_count)

    def insert_expert_answers(self, answers: List[ExpertAnswer]) -> Tuple[int, int]:
        if not answers:
            return (0, 0)

        conn = self._get_conn()
        cursor = conn.cursor()

        session_ids = {a.sessionId for a in answers}
        for s_id in session_ids:
            cursor.execute("SELECT id FROM sessions WHERE id = ?", (s_id,))
            if not cursor.fetchone():
                conn.close()
                raise SessionNotFoundError(s_id)

        inserted_count = 0
        for answer in answers:
            related_ids_json = (
                json.dumps(answer.relatedEventIds)
                if answer.relatedEventIds is not None
                else None
            )
            cursor.execute(
                """
                INSERT OR IGNORE INTO expert_answers (
                    id, session_id, timestamp_ms, question, answer,
                    phase, related_event_id, related_event_ids_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    answer.id,
                    answer.sessionId,
                    answer.timestampMs,
                    answer.question,
                    answer.answer,
                    answer.phase,
                    answer.relatedEventId,
                    related_ids_json,
                ),
            )
            if cursor.rowcount > 0:
                inserted_count += 1

        conn.commit()
        conn.close()
        return (len(answers), inserted_count)

    def get_screen_events(self, session_id: str) -> List[ScreenEvent]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM screen_events WHERE session_id = ? ORDER BY timestamp_ms ASC",
            (session_id,),
        )
        rows = cursor.fetchall()
        conn.close()

        events = []
        for r in rows:
            events.append(
                ScreenEvent(
                    id=r["id"],
                    sessionId=r["session_id"],
                    timestampMs=r["timestamp_ms"],
                    ticketId=r["ticket_id"],
                    type=r["type"],
                    description=r["description"],
                    previousValue=r["previous_value"],
                    newValue=r["new_value"],
                    screenshotRef=r["screenshot_ref"],
                    source=r["source"],
                    confidence=r["confidence"],
                )
            )
        return events

    def get_expert_answers(self, session_id: str) -> List[ExpertAnswer]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM expert_answers WHERE session_id = ? ORDER BY timestamp_ms ASC",
            (session_id,),
        )
        rows = cursor.fetchall()
        conn.close()

        answers = []
        for r in rows:
            related_ids = (
                json.loads(r["related_event_ids_json"])
                if r["related_event_ids_json"]
                else None
            )
            answers.append(
                ExpertAnswer(
                    id=r["id"],
                    sessionId=r["session_id"],
                    timestampMs=r["timestamp_ms"],
                    question=r["question"],
                    answer=r["answer"],
                    phase=r["phase"],
                    relatedEventId=r["related_event_id"],
                    relatedEventIds=related_ids,
                )
            )
        return answers

    def save_work_map(self, work_map: WorkMap) -> WorkMap:
        conn = self._get_conn()
        cursor = conn.cursor()
        payload_json = work_map.model_dump_json(by_alias=True)
        cursor.execute(
            """
            INSERT OR REPLACE INTO work_maps (id, session_id, payload_json)
            VALUES (?, ?, ?)
            """,
            (work_map.id, work_map.sessionId, payload_json),
        )
        conn.commit()
        conn.close()
        return work_map

    def get_work_map(self, work_map_id: str) -> Optional[WorkMap]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT payload_json FROM work_maps WHERE id = ?", (work_map_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return WorkMap.model_validate_json(row["payload_json"])

    def save_decision_attempt(
        self, attempt: DecisionAttempt, result: DecisionEvaluationResult
    ) -> None:
        conn = self._get_conn()
        cursor = conn.cursor()
        intervention_json = (
            result.intervention.model_dump_json(by_alias=True)
            if result.intervention
            else None
        )
        cursor.execute(
            """
            INSERT OR REPLACE INTO decision_attempts (
                id, session_id, ticket_id, timestamp_ms, priority,
                team, action, submitted, allow_save, intervention_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                attempt.id,
                attempt.sessionId,
                attempt.ticketId,
                attempt.timestampMs,
                attempt.priority,
                attempt.team,
                attempt.action,
                1 if attempt.submitted else 0,
                1 if result.allowSave else 0,
                intervention_json,
            ),
        )
        conn.commit()
        conn.close()

    def get_decision_attempts(self, session_id: str) -> List[DecisionAttempt]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM decision_attempts WHERE session_id = ? ORDER BY timestamp_ms ASC",
            (session_id,),
        )
        rows = cursor.fetchall()
        conn.close()

        attempts = []
        for r in rows:
            attempts.append(
                DecisionAttempt(
                    id=r["id"],
                    sessionId=r["session_id"],
                    ticketId=r["ticket_id"],
                    timestampMs=r["timestamp_ms"],
                    priority=r["priority"],
                    team=r["team"],
                    action=r["action"],
                    submitted=bool(r["submitted"]),
                )
            )
        return attempts

    def save_training_result(self, result: TrainingResult) -> TrainingResult:
        conn = self._get_conn()
        cursor = conn.cursor()
        payload_json = result.model_dump_json(by_alias=True)
        cursor.execute(
            """
            INSERT OR REPLACE INTO training_results (id, session_id, payload_json)
            VALUES (?, ?, ?)
            """,
            (result.id, result.sessionId, payload_json),
        )
        conn.commit()
        conn.close()
        return result

    def get_training_result(self, session_id: str) -> Optional[TrainingResult]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT payload_json FROM training_results WHERE session_id = ?", (session_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return TrainingResult.model_validate_json(row["payload_json"])
