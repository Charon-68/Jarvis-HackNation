from typing import Literal, Optional
from pydantic import BaseModel, Field


class AttemptedDecision(BaseModel):
    priority: Optional[str] = None
    team: Optional[str] = None
    action: Optional[str] = None


class DecisionAttempt(BaseModel):
    id: Optional[str] = None
    sessionId: str
    ticketId: str
    timestampMs: int = Field(default=0, ge=0)
    priority: Optional[str] = None
    team: Optional[str] = None
    action: Optional[str] = None
    submitted: bool = True


class ExpertEvidenceRef(BaseModel):
    workMapStepId: str
    timestampMs: int
    screenshotRef: Optional[str] = None


class TutorIntervention(BaseModel):
    ticketId: str
    attemptedDecision: AttemptedDecision
    correct: bool = False
    severity: Literal["warning", "critical"] = "critical"
    message: str
    reason: str
    guardrail: Optional[str] = None
    expertEvidence: Optional[ExpertEvidenceRef] = None


class DecisionEvaluationResult(BaseModel):
    allowSave: bool
    intervention: Optional[TutorIntervention] = None


class TrainingResult(BaseModel):
    id: str
    sessionId: str
    initialDecision: AttemptedDecision
    interventionOccurred: bool = False
    initialDecisionWrong: bool = False
    correctionOccurred: bool = False
    finalDecision: AttemptedDecision
    completed: bool = True
    timestampMs: int = Field(default=0, ge=0)
