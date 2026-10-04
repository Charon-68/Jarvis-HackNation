import json
import os
import tempfile
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.api.answers import get_session_service as get_answer_session_service
from backend.api.events import get_session_service as get_event_session_service
from backend.api.sessions import get_session_service
from backend.api.training import get_session_service as get_training_session_service
from backend.api.workmaps import get_session_service as get_workmap_session_service
from backend.app.main import app
from backend.models.training import AttemptedDecision, TrainingResult
from backend.services.session_service import SessionService
from backend.storage.database import init_db
from backend.storage.repository import StorageRepository
from vision.claude.client import ClaudeClient
from workmap.generator import WorkMapGenerator

FIXTURES_DIR = Path(__file__).parent.parent.parent / "fixtures"


class MockGoldenSynthesisClient:
    def analyze_image(
        self,
        image_base64: str,
        system_prompt: str,
        user_prompt: str,
        media_type: str = "image/png",
    ) -> str:
        # Return canonical WorkMap JSON from fixture
        work_map_fixture = FIXTURES_DIR / "work-map.json"
        return work_map_fixture.read_text()


@pytest.fixture
def golden_db():
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

    yield service

    app.dependency_overrides.clear()
    if os.path.exists(db_path):
        os.remove(db_path)


def test_full_golden_scenario_integration(golden_db):
    """
    Executes the complete Golden Scenario end-to-end:
    Expert Capture -> Session End -> WorkMap Synthesis -> Training Session ->
    Wrong Decision (Blocked with Intervention) -> Corrected Decision (Allowed) ->
    Final Training Result.
    """
    client = TestClient(app)

    # 1. Create Expert Session
    sess_res = client.post(
        "/api/sessions",
        json={
            "id": "session_demo",
            "mode": "expert",
            "expertName": "Demo Expert",
        },
    )
    assert sess_res.status_code == 201
    assert sess_res.json()["phase"] == "capturing"

    # 2. Append Screen Events from fixture
    screen_events_fixture = json.loads((FIXTURES_DIR / "screen-events.json").read_text())
    evt_res = client.post("/api/screen-events", json=screen_events_fixture)
    assert evt_res.status_code == 200
    assert evt_res.json()["count"] == len(screen_events_fixture)

    # 3. Append Expert Answers from fixture
    expert_answers_fixture = json.loads((FIXTURES_DIR / "expert-answers.json").read_text())
    ans_res = client.post("/api/expert-answers", json=expert_answers_fixture)
    assert ans_res.status_code == 200
    assert ans_res.json()["count"] == len(expert_answers_fixture)

    # 4. End Expert Session
    end_res = client.post("/api/sessions/session_demo/end")
    assert end_res.status_code == 200
    assert end_res.json()["phase"] == "debrief"

    # 5. Generate Work Map using stored session evidence + mock synthesis
    from backend.models.workmap import WorkMapGenerateRequest

    mock_gen = WorkMapGenerator(
        client=ClaudeClient(mock_client=MockGoldenSynthesisClient())
    )
    work_map = golden_db.generate_work_map(
        request=WorkMapGenerateRequest(sessionId="session_demo", teachBackConfirmed=True),
        generator=mock_gen,
    )

    assert work_map.id == "workmap_demo"
    assert work_map.confirmedByExpert is True

    # Check session phase updated to map_ready
    sess_check = client.get("/api/sessions/session_demo")
    assert sess_check.json()["phase"] == "map_ready"
    assert sess_check.json()["workMapId"] == "workmap_demo"

    # 6. Create New Hire Training Session
    train_sess_res = client.post(
        "/api/sessions",
        json={
            "id": "session_training_01",
            "mode": "training",
            "traineeName": "New Hire Trainee",
            "workMapId": "workmap_demo",
        },
    )
    assert train_sess_res.status_code == 201
    assert train_sess_res.json()["phase"] == "training"

    # 7. Trainee submits WRONG decision on unseen data-loss case (T_NEW_01)
    wrong_attempt = {
        "id": "attempt_01",
        "sessionId": "session_training_01",
        "ticketId": "T_NEW_01",
        "timestampMs": 10000,
        "priority": "Low Priority",
        "team": "Customer Support",
        "action": "Follow Standard Procedure",
        "submitted": True,
    }
    wrong_eval_res = client.post("/api/training/decision-attempt", json=wrong_attempt)
    assert wrong_eval_res.status_code == 200

    wrong_data = wrong_eval_res.json()
    assert wrong_data["allowSave"] is False
    intervention = wrong_data["intervention"]
    assert intervention is not None
    assert intervention["ticketId"] == "T_NEW_01"
    assert intervention["severity"] == "critical"
    assert "data loss" in intervention["message"].lower()
    assert intervention["guardrail"] == "Possible data loss → stop normal processing and escalate immediately."
    assert intervention["expertEvidence"]["workMapStepId"] == "step_04"
    assert intervention["expertEvidence"]["screenshotRef"] == "frame_050"

    # 8. Trainee submits CORRECTED decision on unseen case (T_NEW_01)
    correct_attempt = {
        "id": "attempt_02",
        "sessionId": "session_training_01",
        "ticketId": "T_NEW_01",
        "timestampMs": 25000,
        "priority": "Emergency",
        "team": "Engineering",
        "action": "Escalate Immediately",
        "submitted": True,
    }
    correct_eval_res = client.post("/api/training/decision-attempt", json=correct_attempt)
    assert correct_eval_res.status_code == 200

    correct_data = correct_eval_res.json()
    assert correct_data["allowSave"] is True
    assert correct_data["intervention"] is None

    # 9. Save final TrainingResult
    result_payload = {
        "id": "res_001",
        "sessionId": "session_training_01",
        "initialDecision": {"priority": "Low Priority", "team": "Customer Support", "action": "Follow Standard Procedure"},
        "interventionOccurred": True,
        "initialDecisionWrong": True,
        "correctionOccurred": True,
        "finalDecision": {"priority": "Emergency", "team": "Engineering", "action": "Escalate Immediately"},
        "completed": True,
        "timestampMs": 30000,
    }
    save_result_res = client.post("/api/training/results", json=result_payload)
    assert save_result_res.status_code == 200

    # Retrieve TrainingResult via GET
    get_result_res = client.get("/api/training/results/session_training_01")
    assert get_result_res.status_code == 200
    res_data = get_result_res.json()
    assert res_data["sessionId"] == "session_training_01"
    assert res_data["interventionOccurred"] is True
    assert res_data["correctionOccurred"] is True
    assert res_data["finalDecision"]["action"] == "Escalate Immediately"
