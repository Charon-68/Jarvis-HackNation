from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from backend.models.training import DecisionAttempt, DecisionEvaluationResult, TrainingResult
from backend.services.session_service import SessionService

router = APIRouter(prefix="/api/training", tags=["training"])


def get_session_service() -> SessionService:
    return SessionService()


@router.post("/decision-attempt", response_model=DecisionEvaluationResult, status_code=200)
def evaluate_decision_attempt(
    attempt: DecisionAttempt,
    service: SessionService = Depends(get_session_service),
) -> DecisionEvaluationResult:
    return service.evaluate_decision_attempt(attempt)


@router.post("/results", response_model=TrainingResult, status_code=200)
def save_training_result(
    result: TrainingResult,
    service: SessionService = Depends(get_session_service),
) -> TrainingResult:
    return service.save_training_result(result)


@router.get("/results/{session_id}", response_model=TrainingResult, status_code=200)
def get_training_result(
    session_id: str,
    service: SessionService = Depends(get_session_service),
) -> TrainingResult:
    res = service.get_training_result(session_id)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No training result found for session '{session_id}'",
        )
    return res
