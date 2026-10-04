from typing import List, Union
from fastapi import APIRouter, Depends
from backend.models.event import ScreenEvent, ScreenEventBatchResponse
from backend.services.session_service import SessionService

router = APIRouter(prefix="/api/screen-events", tags=["events"])


def get_session_service() -> SessionService:
    return SessionService()


@router.post("", response_model=ScreenEventBatchResponse, status_code=200)
def add_screen_events(
    payload: Union[ScreenEvent, List[ScreenEvent]],
    service: SessionService = Depends(get_session_service),
) -> ScreenEventBatchResponse:
    total_count, inserted_count = service.add_screen_events(payload)
    return ScreenEventBatchResponse(count=total_count, inserted=inserted_count)
