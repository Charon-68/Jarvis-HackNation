"""
Rule definitions and canonical expectations for Support Ticket Triage.
"""

from typing import Dict, Any, Optional

CANONICAL_TICKET_RULES: Dict[str, Dict[str, Any]] = {
    "T001": {
        "expected": {
            "priority": "Emergency",
            "team": "Operations",
            "action": "Escalate Immediately",
        },
        "description": "Full production system outage affects all customers → Emergency priority and immediate escalation to Operations.",
        "guardrail": "Full production outage is an Emergency priority.",
        "is_data_loss": False,
    },
    "T002": {
        "expected": {
            "priority": "Emergency",
            "team": "Accounting",
            "action": "Investigate & Resolve",
        },
        "description": "Payroll calculation failure blocks employee disbursement → Emergency priority requiring technical investigation by Accounting.",
        "guardrail": "Payroll processing block is an Emergency priority.",
        "is_data_loss": False,
    },
    "T003": {
        "expected": {
            "priority": "Emergency",
            "team": "Engineering",
            "action": "Escalate Immediately",
        },
        "description": "Possible data loss is a guardrail: do not ask customer to modify/retry data; escalate immediately to Engineering.",
        "guardrail": "Possible data loss → stop normal processing and escalate immediately.",
        "is_data_loss": True,
        "evidence_step_id": "step_04",
        "evidence_timestamp_ms": 50000,
        "evidence_screenshot_ref": "frame_050",
    },
    "T004": {
        "expected": {
            "priority": "Moderate",
            "team": "Engineering",
            "action": "Investigate & Resolve",
        },
        "description": "Multiple users seeing dashboard slowness indicates systemic performance issues → Moderate priority to investigate & resolve.",
        "guardrail": "Multi-user performance issues trigger investigation by Engineering.",
        "is_data_loss": False,
    },
    "T005": {
        "expected": {
            "priority": "Moderate",
            "team": "HR",
            "action": "Follow Standard Procedure",
        },
        "description": "Role-based access provisioning follows established HR onboarding standard procedures.",
        "guardrail": "Follow standard HR provisioning workflow.",
        "is_data_loss": False,
    },
    "T006": {
        "expected": {
            "priority": "Low Priority",
            "team": "Customer Support",
            "action": "Request More Information",
        },
        "description": "Invoice inquiry requires requesting additional billing details from customer support client.",
        "guardrail": "Routine line item billing inquiries require more information.",
        "is_data_loss": False,
    },
    "T007": {
        "expected": {
            "priority": "Low Priority",
            "team": "Customer Support",
            "action": "Monitor & Follow Up",
        },
        "description": "Minor background telemetry delay requires routine monitoring and follow up.",
        "guardrail": "Non-critical background delays should be monitored.",
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
