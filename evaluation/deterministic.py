from typing import Optional

from backend.models.training import DecisionAttempt, DecisionEvaluationResult
from backend.models.workmap import WorkMap
from evaluation.intervention import InterventionBuilder
from evaluation.rules import CANONICAL_TICKET_RULES, is_data_loss_case


class DeterministicEvaluator:
    @staticmethod
    def evaluate(
        attempt: DecisionAttempt, work_map: Optional[WorkMap] = None
    ) -> Optional[DecisionEvaluationResult]:
        ticket_id = attempt.ticketId

        # Check for data loss guardrail violation first (T003, T_NEW_01, etc.)
        if is_data_loss_case(ticket_id):
            action = attempt.action or ""
            if action.strip() != "Escalate Immediately":
                # Critical safety block
                rule = CANONICAL_TICKET_RULES.get(ticket_id, CANONICAL_TICKET_RULES["T003"])
                intervention = InterventionBuilder.create_intervention(
                    ticket_id=ticket_id,
                    priority=attempt.priority,
                    team=attempt.team,
                    action=attempt.action,
                    correct=False,
                    severity="critical",
                    message="Possible data loss is an immediate escalation case.",
                    reason="The expert identified potential data loss as a safety guardrail.",
                    guardrail="Possible data loss → stop normal processing and escalate immediately.",
                    work_map_step_id=rule.get("evidence_step_id", "step_04"),
                    timestamp_ms=rule.get("evidence_timestamp_ms", 50000),
                    screenshot_ref=rule.get("evidence_screenshot_ref", "frame_050"),
                    work_map=work_map,
                )
                return DecisionEvaluationResult(allowSave=False, intervention=intervention)

        # Check against canonical rules table
        rule = CANONICAL_TICKET_RULES.get(ticket_id)
        if not rule:
            # Not a known deterministic rule case -> Return None to allow semantic evaluation
            return None

        expected = rule["expected"]
        priority_ok = not attempt.priority or attempt.priority == expected["priority"]
        team_ok = not attempt.team or attempt.team == expected["team"]
        action_ok = not attempt.action or attempt.action == expected["action"]

        if priority_ok and team_ok and action_ok:
            return DecisionEvaluationResult(allowSave=True, intervention=None)

        # Decision is wrong according to canonical rules
        intervention = InterventionBuilder.create_intervention(
            ticket_id=ticket_id,
            priority=attempt.priority,
            team=attempt.team,
            action=attempt.action,
            correct=False,
            severity="warning",
            message=f"Incorrect triage decision for {ticket_id}.",
            reason=rule["description"],
            guardrail=rule.get("guardrail"),
            work_map=work_map,
        )
        return DecisionEvaluationResult(allowSave=False, intervention=intervention)
