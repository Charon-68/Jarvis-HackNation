from typing import Optional
from backend.models.training import AttemptedDecision, ExpertEvidenceRef, TutorIntervention
from backend.models.workmap import WorkMap


class InterventionBuilder:
    @staticmethod
    def create_intervention(
        ticket_id: str,
        priority: Optional[str] = None,
        team: Optional[str] = None,
        action: Optional[str] = None,
        correct: bool = False,
        severity: str = "critical",
        message: str = "",
        reason: str = "",
        guardrail: Optional[str] = None,
        work_map_step_id: Optional[str] = None,
        timestamp_ms: Optional[int] = None,
        screenshot_ref: Optional[str] = None,
        work_map: Optional[WorkMap] = None,
    ) -> TutorIntervention:
        attempted = AttemptedDecision(priority=priority, team=team, action=action)

        evidence: Optional[ExpertEvidenceRef] = None

        # Look up step evidence from WorkMap if available
        if work_map and work_map.steps:
            for step in work_map.steps:
                # Find matching step by ID or ticket ID
                if (work_map_step_id and step.id == work_map_step_id) or (
                    step.ticketId == ticket_id and "STOP" in step.decision.upper()
                ):
                    evidence = ExpertEvidenceRef(
                        workMapStepId=step.id or "step_04",
                        timestampMs=step.timestampMs,
                        screenshotRef=step.screenshotRef,
                    )
                    break

        if not evidence and work_map_step_id and timestamp_ms is not None:
            evidence = ExpertEvidenceRef(
                workMapStepId=work_map_step_id,
                timestampMs=timestamp_ms,
                screenshotRef=screenshot_ref,
            )

        return TutorIntervention(
            ticketId=ticket_id,
            attemptedDecision=attempted,
            correct=correct,
            severity="critical" if severity == "critical" else "warning",
            message=message,
            reason=reason,
            guardrail=guardrail,
            expertEvidence=evidence,
        )
