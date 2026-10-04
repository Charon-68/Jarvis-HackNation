import json
import re
import uuid
from typing import Any, Dict, Optional

from backend.models.workmap import WorkMap, WorkMapGenerationInput, WorkMapStep
from vision.claude.client import ClaudeAdapterError, ClaudeClient
from workmap.evidence import EvidenceAssociator
from workmap.prompts import WORKMAP_SYNTHESIS_SYSTEM_PROMPT, build_synthesis_user_prompt
from workmap.validator import WorkMapValidationError, WorkMapValidator


class WorkMapGenerator:
    def __init__(self, client: Optional[ClaudeClient] = None):
        self.client = client or ClaudeClient()

    def parse_claude_json(self, text_content: str) -> Dict[str, Any]:
        cleaned = text_content.strip()
        if "```" in cleaned:
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
            if match:
                cleaned = match.group(1).strip()

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            raise WorkMapValidationError(
                f"Failed to parse Claude synthesis output as JSON: {str(e)}"
            ) from e

        if not isinstance(data, dict):
            raise WorkMapValidationError("Claude synthesis output must be a JSON object.")

        return data

    def generate(self, input_data: WorkMapGenerationInput) -> WorkMap:
        session = input_data.session
        events = input_data.screenEvents
        answers = input_data.expertAnswers

        session_json = session.model_dump_json(by_alias=True)
        events_json = json.dumps([e.model_dump(by_alias=True) for e in events])
        answers_json = json.dumps([a.model_dump(by_alias=True) for a in answers])

        user_prompt = build_synthesis_user_prompt(session_json, events_json, answers_json)

        # Call Claude
        if self.client.mock_client is not None:
            raw_response = self.client.mock_client.analyze_image(
                image_base64="",
                system_prompt=WORKMAP_SYNTHESIS_SYSTEM_PROMPT,
                user_prompt=user_prompt,
            )
        else:
            # Standard Claude completion
            raw_response = self.client.analyze_image(
                image_base64="",
                system_prompt=WORKMAP_SYNTHESIS_SYSTEM_PROMPT,
                user_prompt=user_prompt,
            )

        parsed = self.parse_claude_json(raw_response)

        raw_steps = parsed.get("steps", [])
        if not raw_steps or not isinstance(raw_steps, list):
            raise WorkMapValidationError("Synthesized WorkMap contains no steps.")

        steps: list[WorkMapStep] = []
        for idx, step_dict in enumerate(raw_steps):
            step_num = step_dict.get("stepNumber", idx + 1)
            step_id = step_dict.get("id") or f"step_{step_num:02d}"

            step = WorkMapStep(
                id=step_id,
                stepNumber=step_num,
                timestampMs=step_dict.get("timestampMs", 0),
                ticketId=step_dict.get("ticketId"),
                observedAction=step_dict.get("observedAction", ""),
                decision=step_dict.get("decision", ""),
                expertReason=step_dict.get("expertReason", ""),
                guardrails=step_dict.get("guardrails", []),
                exceptions=step_dict.get("exceptions", []),
                teachingPoint=step_dict.get("teachingPoint", ""),
                screenshotRef=step_dict.get("screenshotRef"),
                expertQuote=step_dict.get("expertQuote"),
                sourceEventIds=step_dict.get("sourceEventIds"),
            )
            steps.append(step)

        # Associate evidence references
        steps = EvidenceAssociator.associate_evidence(steps, events, answers)

        workmap_id = parsed.get("id") or f"workmap_{uuid.uuid4().hex[:12]}"
        duration = parsed.get("durationSeconds", 0)

        work_map = WorkMap(
            id=workmap_id,
            sessionId=session.id,
            workflowName="Support Ticket Triage",
            expertName=session.expertName or parsed.get("expertName", "Expert Engineer"),
            durationSeconds=duration,
            steps=steps,
            summary=parsed.get("summary"),
            guardrails=parsed.get("guardrails"),
            exceptions=parsed.get("exceptions"),
            confirmedByExpert=False,
        )

        # Validate WorkMap and apply teach-back confirmation status
        return WorkMapValidator.validate(
            work_map, teach_back_confirmed=input_data.teachBackConfirmed
        )
