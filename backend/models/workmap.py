from typing import List, Literal, Optional
from pydantic import BaseModel, Field

from backend.models.answer import ExpertAnswer
from backend.models.event import ScreenEvent
from backend.models.session import Session


class WorkMapStep(BaseModel):
    id: Optional[str] = None
    stepNumber: int = Field(..., ge=1)
    timestampMs: int = Field(..., ge=0)
    ticketId: Optional[str] = None
    observedAction: str
    decision: str
    expertReason: str
    guardrails: List[str] = Field(default_factory=list)
    exceptions: List[str] = Field(default_factory=list)
    teachingPoint: str
    screenshotRef: Optional[str] = None
    expertQuote: Optional[str] = None
    sourceEventIds: Optional[List[str]] = None


class WorkMap(BaseModel):
    id: str
    sessionId: str
    workflowName: Literal["Support Ticket Triage"] = "Support Ticket Triage"
    expertName: str
    durationSeconds: int = Field(default=0, ge=0)
    steps: List[WorkMapStep]
    summary: Optional[str] = None
    guardrails: Optional[List[str]] = None
    exceptions: Optional[List[str]] = None
    confirmedByExpert: bool = False
    confirmedAt: Optional[str] = None


class WorkMapGenerationInput(BaseModel):
    session: Session
    screenEvents: List[ScreenEvent]
    expertAnswers: List[ExpertAnswer]
    workflowName: Literal["Support Ticket Triage"] = "Support Ticket Triage"
    teachBackConfirmed: bool = False


class WorkMapGenerateRequest(BaseModel):
    sessionId: Optional[str] = None
    session: Optional[Session] = None
    screenEvents: Optional[List[ScreenEvent]] = None
    expertAnswers: Optional[List[ExpertAnswer]] = None
    workflowName: Literal["Support Ticket Triage"] = "Support Ticket Triage"
    teachBackConfirmed: bool = False
