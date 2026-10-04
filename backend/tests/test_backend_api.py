import os
import tempfile
import pytest
from fastapi.testclient import TestClient

from backend.api.answers import get_session_service as get_answer_session_service
from backend.api.events import get_session_service as get_event_session_service
from backend.api.sessions import get_session_service
from backend.app.main import app
from backend.services.session_service import SessionService
from backend.storage.database import init_db
from backend.storage.repository import StorageRepository


@pytest.fixture(autouse=True)
def test_db():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    init_db(db_path)
    repo = StorageRepository(db_path)
    service = SessionService(repo)

    app.dependency_overrides[get_session_service] = lambda: service
    app.dependency_overrides[get_event_session_service] = lambda: service
    app.dependency_overrides[get_answer_session_service] = lambda: service

    yield service

    app.dependency_overrides.clear()
    if os.path.exists(db_path):
        os.remove(db_path)


client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    assert res.json()["db"] == "connected"



def test_create_session():
    res = client.post(
        "/api/sessions",
        json={
            "mode": "expert",
            "expertName": "Alice",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["id"].startswith("sess_")
    assert data["mode"] == "expert"
    assert data["phase"] == "capturing"
    assert data["workflowName"] == "Support Ticket Triage"
    assert data["expertName"] == "Alice"
    assert "startedAt" in data


def test_invalid_session_rejected():
    res = client.post(
        "/api/sessions",
        json={
            "mode": "invalid_mode",
        },
    )
    assert res.status_code == 422
    data = res.json()
    assert data["code"] == "INVALID_REQUEST"
    assert "retryable" in data


def test_end_session():
    create_res = client.post(
        "/api/sessions",
        json={"mode": "expert"},
    )
    session_id = create_res.json()["id"]

    end_res = client.post(f"/api/sessions/{session_id}/end")
    assert end_res.status_code == 200
    data = end_res.json()
    assert data["phase"] == "debrief"
    assert data["endedAt"] is not None


def test_end_invalid_session():
    res = client.post("/api/sessions/non_existent_sess/end")
    assert res.status_code == 404
    data = res.json()
    assert data["code"] == "SESSION_NOT_FOUND"


def test_create_screen_events_and_idempotency():
    create_res = client.post("/api/sessions", json={"mode": "expert"})
    session_id = create_res.json()["id"]

    event_payload = {
        "id": "evt_100",
        "sessionId": session_id,
        "timestampMs": 15000,
        "ticketId": "T001",
        "type": "priority_changed",
        "description": "Changed priority to P1",
        "newValue": "P1",
        "source": "workflow_state",
    }
    res = client.post("/api/screen-events", json=event_payload)
    assert res.status_code == 200
    assert res.json() == {"count": 1, "inserted": 1}

    res_dupe = client.post("/api/screen-events", json=event_payload)
    assert res_dupe.status_code == 200
    assert res_dupe.json() == {"count": 1, "inserted": 0}


def test_create_screen_event_invalid_session():
    event_payload = {
        "id": "evt_999",
        "sessionId": "sess_non_existent",
        "timestampMs": 5000,
        "ticketId": "T001",
        "type": "ticket_opened",
        "description": "Open ticket",
    }
    res = client.post("/api/screen-events", json=event_payload)
    assert res.status_code == 404
    assert res.json()["code"] == "SESSION_NOT_FOUND"


def test_create_expert_answers_and_idempotency():
    create_res = client.post("/api/sessions", json={"mode": "expert"})
    session_id = create_res.json()["id"]

    answer_payload = {
        "id": "ans_100",
        "sessionId": session_id,
        "timestampMs": 20000,
        "question": "Why P1?",
        "answer": "Total outage",
        "phase": "capture",
    }

    res = client.post("/api/expert-answers", json=answer_payload)
    assert res.status_code == 200
    assert res.json() == {"count": 1, "inserted": 1}

    res_dupe = client.post("/api/expert-answers", json=answer_payload)
    assert res_dupe.status_code == 200
    assert res_dupe.json() == {"count": 1, "inserted": 0}


def test_create_expert_answer_invalid_session():
    answer_payload = {
        "id": "ans_999",
        "sessionId": "sess_unknown",
        "timestampMs": 10000,
        "question": "Q?",
        "answer": "A",
        "phase": "debrief",
    }
    res = client.post("/api/expert-answers", json=answer_payload)
    assert res.status_code == 404
    assert res.json()["code"] == "SESSION_NOT_FOUND"
