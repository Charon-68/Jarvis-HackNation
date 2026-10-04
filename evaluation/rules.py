"""
Rule definitions and canonical expectations for Support Ticket Triage.
"""

from typing import Dict, Any, Optional

CANONICAL_TICKET_RULES: Dict[str, Dict[str, Any]] = {
    "T001": {
        "expected": {
            "priority": "Emergency",
            "team": "Engineering",
            "action": "Escalate Immediately",
        },
        "description": "Full production outage affects everyone → Emergency priority and immediate escalation.",
        "guardrail": "Full production outage is an Emergency priority.",
        "is_data_loss": False,
    },
    "T002": {
        "expected": {
            "priority": "Low Priority",
            "team": "Customer Support",
            "action": "Follow Standard Procedure",
        },
        "description": "Single-user login issue is routine unless other users are affected.",
        "guardrail": "Single-user issues are routine unless wider impact appears.",
        "is_data_loss": False,
    },
    "T003": {
        "expected": {
            "priority": "Emergency",
            "team": "Engineering",
            "action": "Escalate Immediately",
        },
        "description": "Possible data loss is a guardrail: do not ask customer to modify/retry data; escalate immediately.",
        "guardrail": "Possible data loss → stop normal processing and escalate immediately.",
        "is_data_loss": True,
        "evidence_step_id": "step_04",
        "evidence_timestamp_ms": 50000,
        "evidence_screenshot_ref": "frame_050",
    },
    "T004": {
        "expected": {
            "priority": "Low Priority",
            "team": "Accounting",
            "action": "Investigate & Resolve",
        },
        "description": "Billing invoice mismatch requires financial investigation and resolution.",
        "guardrail": "Routine billing discrepancies should be investigated by Accounting.",
        "is_data_loss": False,
    },
    "T005": {
        "expected": {
            "priority": "Moderate",
            "team": "Operations",
            "action": "Request More Information",
        },
        "description": "Warehouse sensor telemetry delay requires more info from onsite team.",
        "guardrail": "Gather hardware telemetry details before triggering emergency response.",
        "is_data_loss": False,
    },
    "T006": {
        "expected": {
            "priority": "Moderate",
            "team": "HR",
            "action": "Monitor & Follow Up",
        },
        "description": "Onboarding portal latency during peak hours requires monitoring.",
        "guardrail": "Non-blocking portal latency should be monitored.",
        "is_data_loss": False,
    },
    "T007": {
        "expected": {
            "priority": "Moderate",
            "team": "Engineering",
            "action": "Investigate & Resolve",
        },
        "description": "Third-party webhook integration timeout requires investigation.",
        "guardrail": "Third-party integrations require investigation by Engineering.",
        "is_data_loss": False,
    },
    "T_NEW_01": {
        "expected": {
            "priority": "Emergency",
            "team": "Engineering",
            "action": "Escalate Immediately",
        },
        "description": "12 customers lost transaction history after an update.",
        "guardrail": "Possible data loss → stop normal processing and escalate immediately.",
        "is_data_loss": True,
        "evidence_step_id": "step_04",
        "evidence_timestamp_ms": 50000,
        "evidence_screenshot_ref": "frame_050",
    },
}

DATA_LOSS_KEYWORDS = [
    "data loss",
    "lost transaction history",
    "disappeared",
    "data disappeared",
    "lost data",
]


def is_data_loss_case(ticket_id: str, scenario_text: Optional[str] = None) -> bool:
    if ticket_id in CANONICAL_TICKET_RULES:
        if CANONICAL_TICKET_RULES[ticket_id].get("is_data_loss"):
            return True

    if scenario_text:
        text_lower = scenario_text.lower()
        for kw in DATA_LOSS_KEYWORDS:
            if kw in text_lower:
                return True

    return False
