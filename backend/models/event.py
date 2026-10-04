from typing import Literal, Optional
from pydantic import BaseModel, Field

ScreenEventType = Literal[
    "ticket_opened",
    "field_changed",
    "priority_changed",
    "team_changed",
    "action_changed",
    "decision_saved",
]

ScreenEventSource = Literal["vision", "workflow_state", "hybrid"]


class ScreenEvent(BaseModel):
    id: Optional[str] = None
    sessionId: str
    timestampMs: int = Field(..., ge=0)
    ticketId: str
    type: ScreenEventType
    description: str
    previousValue: Optional[str] = None
    newValue: Optional[str] = None
    screenshotRef: Optional[str] = None
    source: Optional[ScreenEventSource] = None
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class ScreenEventBatchResponse(BaseModel):
    count: int
    inserted: int
