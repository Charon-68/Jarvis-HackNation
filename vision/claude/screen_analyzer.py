import json
import re
from typing import Any, Dict, Optional

from vision.claude.client import ClaudeAdapterError, ClaudeClient
from vision.prompts.screen_event import SCREEN_EVENT_SYSTEM_PROMPT, build_user_prompt


class MalformedVisionOutputError(ClaudeAdapterError):
    def __init__(self, message: str):
        super().__init__(
            message=message,
            code="MALFORMED_VISION_OUTPUT",
            retryable=False,
        )


class ScreenAnalyzer:
    def __init__(self, client: Optional[ClaudeClient] = None):
        self.client = client or ClaudeClient()

    def parse_claude_response(self, text_content: str) -> Dict[str, Any]:
        """
        Extracts and parses JSON from Claude response, handling Markdown code blocks.
        """
        cleaned = text_content.strip()

        if "```" in cleaned:
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
            if match:
                cleaned = match.group(1).strip()

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            raise MalformedVisionOutputError(
                f"Failed to parse Claude output as JSON: {str(e)}. Raw output: {text_content[:200]}"
            ) from e

        if not isinstance(data, dict):
            raise MalformedVisionOutputError("Claude Vision output must be a JSON object.")

        return data

    def analyze_frame(
        self,
        image_base64: str,
        session_id: str,
        timestamp_ms: int,
        screenshot_ref: Optional[str] = None,
        previous_context: Optional[str] = None,
        media_type: str = "image/png",
    ) -> Optional[Dict[str, Any]]:
        """
        Analyzes a single screenshot frame for a Support Triage workflow event.
        Returns parsed raw event dict if an event was detected, or None if no event.
        """
        user_prompt = build_user_prompt(previous_context)
        raw_response = self.client.analyze_image(
            image_base64=image_base64,
            system_prompt=SCREEN_EVENT_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            media_type=media_type,
        )

        parsed_json = self.parse_claude_response(raw_response)

        has_event = parsed_json.get("has_event", False)
        if not has_event:
            return None

        parsed_json["sessionId"] = session_id
        parsed_json["timestampMs"] = timestamp_ms
        if screenshot_ref:
            parsed_json["screenshotRef"] = screenshot_ref

        return parsed_json
