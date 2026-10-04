import json
import os
import tempfile
import pytest
from fastapi.testclient import TestClient

from backend.api.answers import get_session_service as get_answer_session_service
from backend.api.events import get_session_service as get_event_session_service
from backend.api.sessions import get_session_service
from backend.api.workmaps import get_session_service as get_workmap_session_service
from backend.app.main import app
from backend.models.answer import ExpertAnswer
from backend.models.event import ScreenEvent
from backend.models.session import Session, SessionCreate
from backend.models.workmap import (
    WorkMap,
    WorkMapGenerateRequest,
    WorkMapGenerationInput,
    WorkMapStep,
)
from backend.services.session_service import SessionService
from backend.storage.database import init_db
from backend.storage.repository import StorageRepository
from vision.claude.client import ClaudeClient
from workmap.generator import WorkMapGenerator
from workmap.validator import WorkMapValidationError, WorkMapValidator


class MockSynthesisClaudeClient:
    def __init__(self, response_json_str: str):
        self.response_json_str = response_json_str

    def analyze_image(
        self,
        image_base64: str,
        system_prompt: str,
        user_prompt: str,
        media_type: str = "image/png",
    ) -> str:
        return self.response_json_str


@pytest.fixture
def mock_session():
    return Session(
        id="session_demo",
        mode="expert",
        phase="debrief",
        workflowName="Support Ticket Triage",
        startedAt="2026-10-04T00:00:00.000Z",
        expertName="Demo Expert",
    )


@pytest.fixture
def mock_events():
    return [
        ScreenEvent(
            id="evt_001",
            sessionId="session_demo",
            timestampMs=8000,
            ticketId="T001",
            type="ticket_opened",
            description="T001 opened",
            source="workflow_state",
        ),
        ScreenEvent(
            id="evt_003",
            sessionId="session_demo",
            timestampMs=50000,
            ticketId="T003",
            type="action_changed",
            description="Action changed to STOP + escalate",
            newValue="STOP + escalate",
            screenshotRef="frame_050",
            source="hybrid",
        ),
    ]


@pytest.fixture
def mock_answers():
    return [
        ExpertAnswer(
            id="ans_002",
            sessionId="session_demo",
            timestampMs=52000,
            question="Why stop normal troubleshooting?",
            answer="Possible data loss means we stop and escalate.",
            phase="capture",
            relatedEventId="evt_003",
        )
    ]


def test_valid_work_map_generation(mock_session, mock_events, mock_answers):
    synthesis_json = json.dumps(
        {
            "workflowName": "Support Ticket Triage",
            "expertName": "Demo Expert",
            "durationSeconds": 90,
            "summary": "Learned triage workflow",
            "guardrails": ["Possible data loss -> STOP normal processing and escalate."],
            "exceptions": [],
            "steps": [
                {
                    "stepNumber": 1,
                    "timestampMs": 8000,
                    "ticketId": "T001",
                    "observedAction": "Open T001",
                    "decision": "Identify scope",
                    "expertReason": "I first check whether one customer or everyone is affected.",
                    "guardrails": ["Full outage is P1"],
                    "exceptions": [],
                    "teachingPoint": "Determine scope before priority.",
                    "sourceEventIds": ["evt_001"],
                },
                {
                    "stepNumber": 2,
                    "timestampMs": 50000,
                    "ticketId": "T003",
                    "observedAction": "STOP normal troubleshooting",
                    "decision": "P1 + STOP",
                    "expertReason": "Possible data loss means we stop and escalate.",
                    "guardrails": ["Possible data loss -> STOP normal processing and escalate."],
                    "exceptions": [],
                    "teachingPoint": "Protect evidence/data before troubleshooting.",
                    "screenshotRef": "frame_050",
                    "sourceEventIds": ["evt_003"],
                },
            ],
        }
    )

    client = ClaudeClient(mock_client=MockSynthesisClaudeClient(synthesis_json))
    generator = WorkMapGenerator(client=client)

    gen_input = WorkMapGenerationInput(
        session=mock_session,
        screenEvents=mock_events,
        expertAnswers=mock_answers,
        workflowName="Support Ticket Triage",
        teachBackConfirmed=True,
    )

    work_map = generator.generate(gen_input)

    assert isinstance(work_map, WorkMap)
    assert work_map.sessionId == "session_demo"
    assert work_map.confirmedByExpert is True
    assert len(work_map.steps) == 2
    assert work_map.steps[1].ticketId == "T003"
    assert work_map.steps[1].screenshotRef == "frame_050"
    assert work_map.steps[1].expertQuote == "Possible data loss means we stop and escalate."


def test_confirmation_gating_unconfirmed(mock_session, mock_events, mock_answers):
    synthesis_json = json.dumps(
        {
            "workflowName": "Support Ticket Triage",
            "expertName": "Demo Expert",
            "durationSeconds": 90,
            "steps": [
                {
                    "stepNumber": 1,
                    "timestampMs": 8000,
                    "ticketId": "T001",
                    "observedAction": "Open T001",
                    "decision": "Identify scope",
                    "expertReason": "Check impact",
                    "guardrails": [],
                    "exceptions": [],
                    "teachingPoint": "Check scope",
                }
            ],
        }
    )

    client = ClaudeClient(mock_client=MockSynthesisClaudeClient(synthesis_json))
    generator = WorkMapGenerator(client=client)

    gen_input = WorkMapGenerationInput(
        session=mock_session,
        screenEvents=mock_events,
        expertAnswers=mock_answers,
        teachBackConfirmed=False,
    )

    work_map = generator.generate(gen_input)
    assert work_map.confirmedByExpert is False


from pydantic import ValidationError

def test_invalid_workflow_name_rejected():
    with pytest.raises((ValidationError, WorkMapValidationError)):
        WorkMap(
            id="wm_01",
            sessionId="sess_01",
            workflowName="Invalid Workflow Name",  # type: ignore
            expertName="Alice",
            durationSeconds=10,
            steps=[
                WorkMapStep(
                    stepNumber=1,
                    timestampMs=1000,
                    observedAction="Action",
                    decision="Decision",
                    expertReason="Reason",
                    teachingPoint="Point",
                )
            ],
        )



def test_unordered_steps_rejected():
    wm = WorkMap(
        id="wm_02",
        sessionId="sess_01",
        workflowName="Support Ticket Triage",
        expertName="Alice",
        durationSeconds=10,
        steps=[
            WorkMapStep(
                stepNumber=2,
                timestampMs=1000,
                observedAction="Action 2",
                decision="Decision 2",
                expertReason="Reason 2",
                teachingPoint="Point 2",
            ),
            WorkMapStep(
                stepNumber=1,
                timestampMs=2000,
                observedAction="Action 1",
                decision="Decision 1",
                expertReason="Reason 1",
                teachingPoint="Point 1",
            ),
        ],
    )
    with pytest.raises(WorkMapValidationError):
        WorkMapValidator.validate(wm)


def test_workmap_api_regeneration_and_get():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    init_db(db_path)
    repo = StorageRepository(db_path)
    service = SessionService(repo)

    app.dependency_overrides[get_session_service] = lambda: service
    app.dependency_overrides[get_event_session_service] = lambda: service
    app.dependency_overrides[get_answer_session_service] = lambda: service
    app.dependency_overrides[get_workmap_session_service] = lambda: service

    session = service.create_session(
        SessionCreate(id="session_demo", mode="expert", expertName="Demo Expert")
    )
    service.add_screen_events(
        ScreenEvent(
            id="evt_001",
            sessionId="session_demo",
            timestampMs=8000,
            ticketId="T001",
            type="ticket_opened",
            description="Opened T001",
        )
    )
    service.add_expert_answers(
        ExpertAnswer(
            id="ans_001",
            sessionId="session_demo",
            timestampMs=10000,
            question="Why?",
            answer="P1 outage",
            phase="capture",
        )
    )

    synthesis_json = json.dumps(
        {
            "workflowName": "Support Ticket Triage",
            "expertName": "Demo Expert",
            "durationSeconds": 60,
            "steps": [
                {
                    "stepNumber": 1,
                    "timestampMs": 8000,
                    "ticketId": "T001",
                    "observedAction": "Opened T001",
                    "decision": "Inspect outage",
                    "expertReason": "P1 outage",
                    "guardrails": [],
                    "exceptions": [],
                    "teachingPoint": "Check outage",
                    "sourceEventIds": ["evt_001"],
                }
            ],
        }
    )
    mock_gen = WorkMapGenerator(
        client=ClaudeClient(mock_client=MockSynthesisClaudeClient(synthesis_json))
    )

    client = TestClient(app)

    work_map = service.generate_work_map(
        request=WorkMapGenerateRequest(sessionId="session_demo", teachBackConfirmed=True),
        generator=mock_gen,
    )

    assert work_map.id.startswith("workmap_")
    assert work_map.sessionId == "session_demo"
    assert work_map.confirmedByExpert is True

    updated_session = service.get_session("session_demo")
    assert updated_session.phase == "map_ready"
    assert updated_session.workMapId == work_map.id

    res = client.get(f"/api/work-maps/{work_map.id}")
    assert res.status_code == 200
    fetched_wm = res.json()
    assert fetched_wm["id"] == work_map.id
    assert fetched_wm["sessionId"] == "session_demo"

    events_in_db = repo.get_screen_events("session_demo")
    answers_in_db = repo.get_expert_answers("session_demo")
    assert len(events_in_db) == 1
    assert len(answers_in_db) == 1

    app.dependency_overrides.clear()
    if os.path.exists(db_path):
        os.remove(db_path)
