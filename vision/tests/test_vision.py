import json
import pytest

from backend.models.event import ScreenEvent
from vision.claude.client import ClaudeClient
from vision.claude.screen_analyzer import MalformedVisionOutputError, ScreenAnalyzer
from vision.normalization.deduplicator import EventDeduplicator
from vision.normalization.event_normalizer import normalize_event


class DummyMockClaudeClient:
    def __init__(self, response_text: str):
        self.response_text = response_text

    def analyze_image(
        self,
        image_base64: str,
        system_prompt: str,
        user_prompt: str,
        media_type: str = "image/png",
    ) -> str:
        return self.response_text


def test_t003_action_changed_mocked():
    mock_json = json.dumps(
        {
            "has_event": True,
            "ticketId": "T003",
            "type": "action_changed",
            "description": "Expert changed action to STOP + escalate",
            "previousValue": "Normal troubleshooting",
            "newValue": "STOP + escalate",
            "confidence": 0.95,
        }
    )

    client = ClaudeClient(mock_client=DummyMockClaudeClient(mock_json))
    analyzer = ScreenAnalyzer(client=client)

    raw_event = analyzer.analyze_frame(
        image_base64="dummy_b64",
        session_id="session_demo",
        timestamp_ms=50000,
        screenshot_ref="frame_050",
    )

    assert raw_event is not None
    assert raw_event["ticketId"] == "T003"
    assert raw_event["type"] == "action_changed"

    event = normalize_event(
        session_id="session_demo",
        timestamp_ms=50000,
        vision_observation=raw_event,
        screenshot_ref="frame_050",
    )

    assert isinstance(event, ScreenEvent)
    assert event.ticketId == "T003"
    assert event.type == "action_changed"
    assert event.newValue == "STOP + escalate"
    assert event.source == "vision"
    assert event.confidence == 0.95
    assert event.screenshotRef == "frame_050"
    assert event.sessionId == "session_demo"
    assert event.timestampMs == 50000


def test_hybrid_signal_normalization():
    vision_obs = {
        "ticketId": "T001",
        "type": "priority_changed",
        "description": "Priority set to P1",
        "previousValue": "P3",
        "newValue": "P1",
        "confidence": 0.90,
    }
    workflow_state = {
        "ticketId": "T001",
        "type": "priority_changed",
        "description": "Priority set to P1",
        "newValue": "P1",
    }

    event = normalize_event(
        session_id="session_demo",
        timestamp_ms=18000,
        vision_observation=vision_obs,
        workflow_state=workflow_state,
        screenshot_ref="frame_008",
    )

    assert event.source == "hybrid"
    assert event.confidence == 0.90
    assert event.ticketId == "T001"


def test_malformed_claude_json_rejected():
    client = ClaudeClient(mock_client=DummyMockClaudeClient("THIS IS NOT VALID JSON"))
    analyzer = ScreenAnalyzer(client=client)

    with pytest.raises(MalformedVisionOutputError):
        analyzer.analyze_frame(
            image_base64="dummy_b64",
            session_id="session_demo",
            timestamp_ms=1000,
        )


def test_invalid_event_type_rejected():
    invalid_obs = {
        "ticketId": "T003",
        "type": "invalid_type_here",
        "description": "Some description",
    }
    with pytest.raises(MalformedVisionOutputError):
        normalize_event(
            session_id="session_demo",
            timestamp_ms=1000,
            vision_observation=invalid_obs,
        )


def test_missing_ticket_id_rejected():
    invalid_obs = {
        "type": "action_changed",
        "description": "No ticket ID provided",
    }
    with pytest.raises(MalformedVisionOutputError):
        normalize_event(
            session_id="session_demo",
            timestamp_ms=1000,
            vision_observation=invalid_obs,
        )


def test_deduplication_suppresses_duplicates():
    dedup = EventDeduplicator(time_window_ms=5000)

    event1 = ScreenEvent(
        id="evt_01",
        sessionId="session_demo",
        timestampMs=50000,
        ticketId="T003",
        type="action_changed",
        description="Action changed",
        newValue="STOP + escalate",
        source="vision",
    )

    event2 = ScreenEvent(
        id="evt_02",
        sessionId="session_demo",
        timestampMs=51000,
        ticketId="T003",
        type="action_changed",
        description="Action changed",
        newValue="STOP + escalate",
        source="vision",
    )

    event3 = ScreenEvent(
        id="evt_03",
        sessionId="session_demo",
        timestampMs=60000,
        ticketId="T003",
        type="action_changed",
        description="Action changed",
        newValue="STOP + escalate",
        source="vision",
    )

    assert dedup.should_emit(event1) is True
    assert dedup.should_emit(event2) is False
    assert dedup.should_emit(event3) is True
