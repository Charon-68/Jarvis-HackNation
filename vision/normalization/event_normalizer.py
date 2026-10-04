import uuid
from typing import Any, Dict, Optional, Set

from backend.models.event import ScreenEvent, ScreenEventSource, ScreenEventType
from vision.claude.screen_analyzer import MalformedVisionOutputError

VALID_EVENT_TYPES: Set[str] = {
    "ticket_opened",
    "field_changed",
    "priority_changed",
    "team_changed",
    "action_changed",
    "decision_saved",
}


def normalize_event(
    session_id: str,
    timestamp_ms: int,
    vision_observation: Optional[Dict[str, Any]] = None,
    workflow_state: Optional[Dict[str, Any]] = None,
    screenshot_ref: Optional[str] = None,
    event_id: Optional[str] = None,
) -> ScreenEvent:
    """
    Normalizes a vision observation and/or workflow state signal into a canonical ScreenEvent.
    
    Source assignment:
    - Both vision_observation and workflow_state -> "hybrid"
    - Only vision_observation -> "vision"
    - Only workflow_state -> "workflow_state"
    """
    if not vision_observation and not workflow_state:
        raise MalformedVisionOutputError(
            "Cannot normalize event: both vision_observation and workflow_state are missing."
        )

    # Determine source
    source: ScreenEventSource
    if vision_observation and workflow_state:
        source = "hybrid"
    elif vision_observation:
        source = "vision"
    else:
        source = "workflow_state"

    # Extract fields prioritizing workflow_state for exactness, supplemented by vision
    raw = {}
    if vision_observation:
        raw.update(vision_observation)
    if workflow_state:
        raw.update(workflow_state)

    ticket_id = raw.get("ticketId") or raw.get("ticket_id")
    if not ticket_id or not isinstance(ticket_id, str) or not ticket_id.strip():
        raise MalformedVisionOutputError(f"Invalid or missing 'ticketId': {ticket_id}")

    event_type = raw.get("type") or raw.get("event_type")
    if not event_type or event_type not in VALID_EVENT_TYPES:
        raise MalformedVisionOutputError(
            f"Invalid or unsupported event type '{event_type}'. Must be one of {VALID_EVENT_TYPES}."
        )

    description = raw.get("description")
    if not description or not isinstance(description, str) or not description.strip():
        raise MalformedVisionOutputError(f"Invalid or missing 'description': {description}")

    previous_val = raw.get("previousValue") or raw.get("previous_value")
    new_val = raw.get("newValue") or raw.get("new_value")

    # Screenshot reference priority
    ref = screenshot_ref or raw.get("screenshotRef") or raw.get("screenshot_ref")

    # Confidence validation
    confidence = raw.get("confidence")
    if confidence is not None:
        try:
            confidence = float(confidence)
            if not (0.0 <= confidence <= 1.0):
                raise ValueError
        except (ValueError, TypeError) as e:
            raise MalformedVisionOutputError(
                f"Confidence must be a float between 0.0 and 1.0, got: {confidence}"
            ) from e

    final_id = event_id or raw.get("id") or f"evt_{uuid.uuid4().hex[:12]}"

    return ScreenEvent(
        id=final_id,
        sessionId=session_id,
        timestampMs=timestamp_ms,
        ticketId=ticket_id,
        type=event_type,  # type: ignore
        description=description,
        previousValue=previous_val,
        newValue=new_val,
        screenshotRef=ref,
        source=source,
        confidence=confidence,
    )
