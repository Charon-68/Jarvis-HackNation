import json
import re
from typing import Optional

from backend.models.training import DecisionAttempt, DecisionEvaluationResult
from backend.models.workmap import WorkMap
from evaluation.intervention import InterventionBuilder
from vision.claude.client import ClaudeClient

SEMANTIC_EVALUATION_SYSTEM_PROMPT = """You are an AI Apprentice Tutor Evaluator for Support Ticket Triage.
Your role is to evaluate a trainee's attempted triage decision against learned expert reasoning in a Work Map.

INSTRUCTIONS:
1. Compare the trainee's attempted priority, team, and action against the Work Map rules.
2. Determine if the decision is correct and safe to save (`allowSave`: true/false).
3. If `allowSave` is false, provide a helpful explanation and guardrail reference.

RETURN STRICTLY VALID JSON SCHEMA:
{
  "allowSave": boolean,
  "severity": "warning" | "critical",
  "message": "Clear explanation for trainee",
  "reason": "Expert-grounded reason",
  "guardrail": "Relevant guardrail rule or null"
}
"""


class SemanticEvaluator:
    def __init__(self, client: Optional[ClaudeClient] = None):
        self.client = client or ClaudeClient()

    def evaluate(
        self,
        attempt: DecisionAttempt,
        work_map: Optional[WorkMap] = None,
        client: Optional[ClaudeClient] = None,
    ) -> DecisionEvaluationResult:
        active_client = client or self.client

        work_map_summary = ""
        if work_map:
            work_map_summary = work_map.model_dump_json(by_alias=True)

        user_prompt = f"""EVALUATE TRIAGE ATTEMPT:
Ticket ID: {attempt.ticketId}
Attempted Priority: {attempt.priority}
Attempted Team: {attempt.team}
Attempted Action: {attempt.action}

WORK MAP REASONING:
{work_map_summary}
"""

        try:
            raw_response = active_client.analyze_image(
                image_base64="",
                system_prompt=SEMANTIC_EVALUATION_SYSTEM_PROMPT,
                user_prompt=user_prompt,
            )

            cleaned = raw_response.strip()
            if "```" in cleaned:
                match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
                if match:
                    cleaned = match.group(1).strip()

            parsed = json.loads(cleaned)
            allow_save = parsed.get("allowSave", False)

            if allow_save:
                return DecisionEvaluationResult(allowSave=True, intervention=None)

            intervention = InterventionBuilder.create_intervention(
                ticket_id=attempt.ticketId,
                priority=attempt.priority,
                team=attempt.team,
                action=attempt.action,
                correct=False,
                severity=parsed.get("severity", "warning"),
                message=parsed.get("message", "Triage decision does not match expert reasoning."),
                reason=parsed.get("reason", "Decision conflicts with learned Work Map rules."),
                guardrail=parsed.get("guardrail"),
                work_map=work_map,
            )
            return DecisionEvaluationResult(allowSave=False, intervention=intervention)

        except Exception as e:
            # On Claude failure or API error, fallback safely to block save
            intervention = InterventionBuilder.create_intervention(
                ticket_id=attempt.ticketId,
                priority=attempt.priority,
                team=attempt.team,
                action=attempt.action,
                correct=False,
                severity="warning",
                message="Evaluator service unavailable. Please review triage decision.",
                reason=f"Semantic evaluation fallback due to service error: {str(e)}",
                work_map=work_map,
            )
            return DecisionEvaluationResult(allowSave=False, intervention=intervention)
