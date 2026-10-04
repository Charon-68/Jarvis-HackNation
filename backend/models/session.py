import uuid
from datetime import datetime, timezone
from typing import Literal, Optional
from pydantic import BaseModel, Field

SessionMode = Literal["expert", "training"]
SessionPhase = Literal[
    "ready",
    "capturing",
    "debrief",
    "map_ready",
    "training",
    "completed",
    "error",
]


class SessionCreate(BaseModel):
    id: Optional[str] = None
    mode: SessionMode = "expert"
    phase: Optional[SessionPhase] = None
    workflowName: Literal["Support Ticket Triage"] = "Support Ticket Triage"
    startedAt: Optional[str] = None
    expertName: Optional[str] = None
    traineeName: Optional[str] = None
    agentConversationId: Optional[str] = None
    workMapId: Optional[str] = None


class Session(BaseModel):
    id: str
    mode: SessionMode
    phase: SessionPhase
    workflowName: Literal["Support Ticket Triage"] = "Support Ticket Triage"
    startedAt: str
    endedAt: Optional[str] = None
    expertName: Optional[str] = None
    traineeName: Optional[str] = None
    agentConversationId: Optional[str] = None
    workMapId: Optional[str] = None


class SessionEndRequest(BaseModel):
    phase: Optional[SessionPhase] = None
    endedAt: Optional[str] = None
