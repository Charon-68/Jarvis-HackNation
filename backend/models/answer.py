from typing import List, Literal, Optional
from pydantic import BaseModel, Field

AnswerPhase = Literal["capture", "debrief"]


class ExpertAnswer(BaseModel):
    id: Optional[str] = None
    sessionId: str
    timestampMs: int = Field(..., ge=0)
    question: str
    answer: str
    phase: AnswerPhase
    relatedEventId: Optional[str] = None
    relatedEventIds: Optional[List[str]] = None


class ExpertAnswerBatchResponse(BaseModel):
    count: int
    inserted: int
