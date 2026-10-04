import os
import tempfile
import pytest
from fastapi.testclient import TestClient

from backend.api.answers import get_session_service as get_answer_session_service
from backend.api.events import get_session_service as get_event_session_service
from backend.api.sessions import get_session_service
from backend.api.training import get_session_service as get_training_session_service
from backend.api.workmaps import get_session_service as get_workmap_session_service
from backend.app.main import app
from backend.models.session import SessionCreate
from backend.models.training import DecisionAttempt
from backend.models.workmap import WorkMap, WorkMapStep
from backend.services.session_service import SessionService
from backend.storage.database import init_db
from backend.storage.repository import StorageRepository
from evaluation.deterministic import DeterministicEvaluator
from evaluation.evaluator import DecisionEvaluator
from evaluation.semantic import SemanticEvaluator
from vision.claude.client import ClaudeClient, ClaudeAdapterError


class FailingClaudeClient:
    def analyze_image(self, image_base64: str, system_prompt: str, user_prompt: str, media_type: str = "image/png") -> str:
        raise ClaudeAdapterError("API unavailable", code="CLAUDE_API_FAILURE", retryable=True)


@pytest.fixture
def sample_work_map():
    return WorkMap(
        id="workmap_demo",
        sessionId="session_demo",
        workflowName="Support Ticket Triage",
        expertName="Demo Expert",
        durationSeconds=90,
        confirmedByExpert=True,
        steps=[
            WorkMapStep(
                id="step_04",
                stepNumber=4,
                timestampMs=50000,
                ticketId="T003",
                observedAction="STOP normal troubleshooting",
                decision="P1 + STOP",
                expertReason="Missing customer data can become worse if we ask them to change or retry things.",
                guardrails=["Possible data loss → STOP normal processing and escalate."],
                exceptions=[],
                teachingPoint="Protect evidence/data before troubleshooting.",
                screenshotRef="frame_050",
            )
        ],
    )


def test_t001_full_outage_accepted():
    evaluator = DecisionEvaluator()
    attempt = DecisionAttempt(
        sessionId="session_demo",
        ticketId="T001",
        priority="Emergency",
        team="Engineering",
        action="Escalate Immediately",
    )
    result = evaluator.evaluate(attempt)
    assert result.allowSave is True
    assert result.intervention is None


def test_t002_single_user_accepted():
    evaluator = DecisionEvaluator()
    attempt = DecisionAttempt(
        sessionId="session_demo",
        ticketId="T002",
        priority="Low Priority",
        team="Customer Support",
        action="Follow Standard Procedure",
    )
    result = evaluator.evaluate(attempt)
    assert result.allowSave is True
    assert result.intervention is None


def test_t003_wrong_decision_blocked(sample_work_map):
    evaluator = DecisionEvaluator()
    attempt = DecisionAttempt(
        sessionId="session_demo",
        ticketId="T003",
        priority="Low Priority",
        team="Customer Support",
        action="Follow Standard Procedure",
    )
    result = evaluator.evaluate(attempt, work_map=sample_work_map)
    assert result.allowSave is False
    assert result.intervention is not None
    assert result.intervention.ticketId == "T003"
    assert result.intervention.severity == "critical"
    assert "data loss" in result.intervention.message.lower()
    assert result.intervention.guardrail == "Possible data loss → stop normal processing and escalate immediately."
    assert result.intervention.expertEvidence is not None
    assert result.intervention.expertEvidence.workMapStepId == "step_04"


def test_t003_correct_decision_allowed(sample_work_map):
    evaluator = DecisionEvaluator()
    attempt = DecisionAttempt(
        sessionId="session_demo",
        ticketId="T003",
        priority="Emergency",
        team="Engineering",
        action="Escalate Immediately",
    )
    result = evaluator.evaluate(attempt, work_map=sample_work_map)
    assert result.allowSave is True
    assert result.intervention is None


def test_t004_password_reset_accepted():
    evaluator = DecisionEvaluator()
    attempt = DecisionAttempt(
        sessionId="session_demo",
        ticketId="T004",
        priority="Low Priority",
        team="Accounting",
        action="Investigate & Resolve",
    )
    result = evaluator.evaluate(attempt)
    assert result.allowSave is True


def test_t005_api_error_accepted():
    evaluator = DecisionEvaluator()
    attempt = DecisionAttempt(
        sessionId="session_demo",
        ticketId="T005",
        priority="Moderate",
        team="Operations",
        action="Request More Information",
    )
    result = evaluator.evaluate(attempt)
    assert result.allowSave is True


def test_t006_slow_dashboard_accepted():
    evaluator = DecisionEvaluator()
    attempt = DecisionAttempt(
        sessionId="session_demo",
        ticketId="T006",
        priority="Moderate",
        team="HR",
        action="Monitor & Follow Up",
    )
    result = evaluator.evaluate(attempt)
    assert result.allowSave is True


def test_unseen_data_loss_case_wrong_decision(sample_work_map):
    """
    Critical requirement:
    Low Priority / Customer Support / Follow Standard Procedure on the unseen data-loss case (T_NEW_01)
    MUST return allowSave=false and severity=critical.
    """
    evaluator = DecisionEvaluator()
    attempt = DecisionAttempt(
        sessionId="session_demo",
        ticketId="T_NEW_01",
        priority="Low Priority",
        team="Customer Support",
        action="Follow Standard Procedure",
    )
    result = evaluator.evaluate(attempt, work_map=sample_work_map)

    assert result.allowSave is False
    assert result.intervention is not None
    assert result.intervention.ticketId == "T_NEW_01"
    assert result.intervention.severity == "critical"
    assert result.intervention.guardrail == "Possible data loss → stop normal processing and escalate immediately."
    assert result.intervention.expertEvidence is not None


def test_unseen_data_loss_case_corrected(sample_work_map):
    evaluator = DecisionEvaluator()
    attempt = DecisionAttempt(
        sessionId="session_demo",
        ticketId="T_NEW_01",
        priority="Emergency",
        team="Engineering",
        action="Escalate Immediately",
    )
    result = evaluator.evaluate(attempt, work_map=sample_work_map)

    assert result.allowSave is True
    assert result.intervention is None


def test_deterministic_block_offline_without_claude():
    """
    Evaluator must deterministically block unsafe saves even if Claude/ElevenLabs are completely offline/unavailable.
    """
    failing_client = ClaudeClient(mock_client=FailingClaudeClient())
    evaluator = DecisionEvaluator(client=failing_client)

    attempt = DecisionAttempt(
        sessionId="session_demo",
        ticketId="T_NEW_01",
        priority="Low Priority",
        team="Customer Support",
        action="Follow Standard Procedure",
    )
    result = evaluator.evaluate(attempt)

    assert result.allowSave is False
    assert result.intervention is not None
    assert result.intervention.severity == "critical"


def test_semantic_evaluator_fallback_on_failure():
    failing_client = ClaudeClient(mock_client=FailingClaudeClient())
    evaluator = SemanticEvaluator(client=failing_client)

    attempt = DecisionAttempt(
        sessionId="session_demo",
        ticketId="UNKNOWN_TICKET_999",
        priority="Low Priority",
        action="Unknown Action",
    )
    result = evaluator.evaluate(attempt)

    assert result.allowSave is False
    assert result.intervention is not None
    assert "unavailable" in result.intervention.message.lower()


def test_training_decision_attempt_api_endpoint():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    init_db(db_path)
    repo = StorageRepository(db_path)
    service = SessionService(repo)

    app.dependency_overrides[get_session_service] = lambda: service
    app.dependency_overrides[get_event_session_service] = lambda: service
    app.dependency_overrides[get_answer_session_service] = lambda: service
    app.dependency_overrides[get_workmap_session_service] = lambda: service
    app.dependency_overrides[get_training_session_service] = lambda: service

    client = TestClient(app)

    # Post decision attempt to endpoint
    payload = {
        "sessionId": "session_demo",
        "ticketId": "T_NEW_01",
        "priority": "Low Priority",
        "team": "Customer Support",
        "action": "Follow Standard Procedure",
        "submitted": True,
    }
    res = client.post("/api/training/decision-attempt", json=payload)
    assert res.status_code == 200

    data = res.json()
    assert data["allowSave"] is False
    assert data["intervention"]["ticketId"] == "T_NEW_01"
    assert data["intervention"]["severity"] == "critical"
    assert "data loss" in data["intervention"]["message"].lower()

    app.dependency_overrides.clear()
    if os.path.exists(db_path):
        os.remove(db_path)
