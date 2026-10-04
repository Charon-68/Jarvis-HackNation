"""
Rule definitions and canonical expectations for Support Ticket Triage.
"""

from typing import Dict, Any, Optional

CANONICAL_TICKET_RULES: Dict[str, Dict[str, Any]] = {
    "T001": {
        "expected": {
            "priority": "P1",
            "team": "Infrastructure",
            "action": "Immediate escalation",
        },
        "description": "Full production outage affects everyone → P1 and immediate escalation.",
        "guardrail": "Full production outage is P1.",
        "is_data_loss": False,
    },
    "T002": {
        "expected": {
            "priority": "P3",
            "team": "Support",
            "action": "Normal troubleshooting",
        },
        "description": "Single-user login issue is routine unless other users are affected.",
        "guardrail": "Single-user issues are routine unless wider impact appears.",
        "is_data_loss": False,
    },
    "T003": {
        "expected": {
            "priority": "P1",
            "team": "Engineering",
            "action": "STOP + escalate",
        },
        "description": "Possible data loss is a guardrail: do not ask customer to modify/retry data; escalate.",
        "guardrail": "Possible data loss → stop normal processing and escalate.",
        "is_data_loss": True,
        "evidence_step_id": "step_04",
        "evidence_timestamp_ms": 50000,
        "evidence_screenshot_ref": "frame_050",
    },
    "T004": {
        "expected": {
            "priority": "P3",
            "team": "Support",
            "action": "Send reset procedure",
        },
        "description": "Routine request; no escalation needed.",
        "guardrail": "Routine password resets do not require escalation.",
        "is_data_loss": False,
    },
    "T005": {
        "expected": {
            "priority": "P1",
            "team": "Engineering",
            "action": "Immediate escalation",
        },
        "description": "Multi-customer API failure indicates a system-wide incident.",
        "guardrail": "Multiple customers with API errors indicate systemic incident.",
        "is_data_loss": False,
    },
    "T006": {
        "expected": {
            "priority": "P2",
            "team": "Engineering",
            "action": "Investigate performance",
        },
        "description": "Several customers reporting slowness -> investigate system performance.",
        "guardrail": "Multiple customers reporting performance issues trigger investigation.",
        "is_data_loss": False,
    },
    "T_NEW_01": {
        "expected": {
            "priority": "P1",
            "team": "Engineering",
            "action": "STOP + escalate",
        },
        "description": "12 customers lost transaction history after an update.",
        "guardrail": "Possible data loss → stop normal processing and escalate.",
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
