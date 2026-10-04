from typing import List, Union
from fastapi import APIRouter, Depends
from backend.models.answer import ExpertAnswer, ExpertAnswerBatchResponse
from backend.services.session_service import SessionService

router = APIRouter(prefix="/api/expert-answers", tags=["answers"])


def get_session_service() -> SessionService:
    return SessionService()


@router.post("", response_model=ExpertAnswerBatchResponse, status_code=200)
def add_expert_answers(
    payload: Union[ExpertAnswer, List[ExpertAnswer]],
    service: SessionService = Depends(get_session_service),
) -> ExpertAnswerBatchResponse:
    total_count, inserted_count = service.add_expert_answers(payload)
    return ExpertAnswerBatchResponse(count=total_count, inserted=inserted_count)
