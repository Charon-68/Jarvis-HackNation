"""
Contract tests — verify shared interfaces between agents, backend, and frontend.
"""
import json
from pathlib import Path


DEMO_TICKETS_PATH = Path(__file__).parent.parent / "shared" / "demo-tickets.json"

REQUIRED_TICKET_FIELDS = {"id", "title", "description", "priority", "status", "createdAt", "updatedAt"}
VALID_PRIORITIES = {"low", "medium", "high", "critical"}
VALID_STATUSES = {"open", "in_progress", "resolved", "closed"}


def test_demo_tickets_valid():
    tickets = json.loads(DEMO_TICKETS_PATH.read_text())
    assert isinstance(tickets, list), "demo-tickets.json must be a JSON array"
    assert len(tickets) > 0, "demo-tickets.json must not be empty"
    for ticket in tickets:
        missing = REQUIRED_TICKET_FIELDS - ticket.keys()
        assert not missing, f"Ticket {ticket.get('id')} missing fields: {missing}"
        assert ticket["priority"] in VALID_PRIORITIES
        assert ticket["status"] in VALID_STATUSES
