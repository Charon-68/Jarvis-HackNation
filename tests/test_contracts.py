"""
Contract tests — verify shared interfaces and canonical fixtures
for Support Ticket Triage architecture.
"""

import json
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DEMO_TICKETS_PATH = BASE_DIR / "shared" / "demo-tickets.json"
FIXTURES_DIR = BASE_DIR / "fixtures"

REQUIRED_TICKET_FIELDS = {
    "id",
    "customer",
    "issue",
    "scope",
    "priority",
    "team",
    "action",
    "expertReasoning",
}
VALID_PRIORITIES = {"P1", "P2", "P3"}
VALID_TEAMS = {"Infrastructure", "Support", "Engineering"}
VALID_ACTIONS = {
    "Immediate escalation",
    "Normal troubleshooting",
    "STOP normal processing + escalate",
    "Send reset procedure",
    "Investigate performance",
}


def test_demo_tickets_valid():
    tickets = json.loads(DEMO_TICKETS_PATH.read_text())
    assert isinstance(tickets, list), "demo-tickets.json must be a JSON array"
    assert len(tickets) == 6, f"Expected 6 tickets (T001-T006), got {len(tickets)}"

    ticket_ids = [t.get("id") for t in tickets]
    assert ticket_ids == ["T001", "T002", "T003", "T004", "T005", "T006"]

    for ticket in tickets:
        missing = REQUIRED_TICKET_FIELDS - ticket.keys()
        assert not missing, f"Ticket {ticket.get('id')} missing fields: {missing}"
        assert ticket["priority"] in VALID_PRIORITIES, f"Invalid priority: {ticket['priority']}"
        assert ticket["team"] in VALID_TEAMS, f"Invalid team: {ticket['team']}"
        assert ticket["action"] in VALID_ACTIONS, f"Invalid action: {ticket['action']}"


def test_fixtures_expert_session_valid():
    session_file = FIXTURES_DIR / "expert-session.json"
    session = json.loads(session_file.read_text())
    assert session["id"] == "session_demo"
    assert session["mode"] == "expert"
    assert session["phase"] in {"ready", "capturing", "debrief", "map_ready", "training", "completed", "error"}
    assert session["workflowName"] == "Support Ticket Triage"
    assert "expertName" in session
    assert "startedAt" in session


def test_fixtures_screen_events_valid():
    events_file = FIXTURES_DIR / "screen-events.json"
    events = json.loads(events_file.read_text())
    assert isinstance(events, list)
    assert len(events) > 0

    valid_event_types = {
        "ticket_opened",
        "field_changed",
        "priority_changed",
        "team_changed",
        "action_changed",
        "decision_saved",
    }
    for event in events:
        assert "id" in event
        assert "sessionId" in event
        assert "timestampMs" in event
        assert "ticketId" in event
        assert event["type"] in valid_event_types
        assert "description" in event


def test_fixtures_expert_answers_valid():
    answers_file = FIXTURES_DIR / "expert-answers.json"
    answers = json.loads(answers_file.read_text())
    assert isinstance(answers, list)
    assert len(answers) > 0

    for ans in answers:
        assert "id" in ans
        assert "sessionId" in ans
        assert "timestampMs" in ans
        assert "question" in ans
        assert "answer" in ans
        assert ans["phase"] in {"capture", "debrief"}


def test_fixtures_work_map_valid():
    work_map_file = FIXTURES_DIR / "work-map.json"
    work_map = json.loads(work_map_file.read_text())
    assert work_map["id"] == "workmap_demo"
    assert work_map["workflowName"] == "Support Ticket Triage"
    assert isinstance(work_map["steps"], list)
    assert len(work_map["steps"]) > 0

    for step in work_map["steps"]:
        assert "id" in step
        assert "stepNumber" in step
        assert "timestampMs" in step
        assert "observedAction" in step
        assert "decision" in step
        assert "expertReason" in step
        assert isinstance(step["guardrails"], list)
        assert isinstance(step["exceptions"], list)
        assert "teachingPoint" in step


def test_fixtures_trainee_case_valid():
    case_file = FIXTURES_DIR / "trainee-case.json"
    case = json.loads(case_file.read_text())
    assert case["id"] == "T_NEW_01"
    assert "scenario" in case
    assert case["expected"]["priority"] == "P1"
    assert case["expected"]["team"] == "Engineering"
    assert case["expected"]["action"] == "STOP + escalate"
    assert case["canonicalMistake"]["priority"] == "P3"


def test_fixtures_tutor_intervention_valid():
    intervention_file = FIXTURES_DIR / "tutor-intervention.json"
    intervention = json.loads(intervention_file.read_text())
    assert intervention["ticketId"] == "T_NEW_01"
    assert intervention["correct"] is False
    assert intervention["severity"] in {"warning", "critical"}
    assert "message" in intervention
    assert "reason" in intervention
    assert "guardrail" in intervention
    assert "expertEvidence" in intervention
