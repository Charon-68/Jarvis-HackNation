from typing import List, Optional
from fastapi import APIRouter, Depends
from backend.models.answer import ExpertAnswer
from backend.models.event import ScreenEvent
from backend.models.session import Session, SessionCreate, SessionEndRequest
from backend.services.session_service import SessionService
from backend.storage.repository import SessionNotFoundError

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def get_session_service() -> SessionService:
    return SessionService()


@router.post("", response_model=Session, status_code=201)
def create_session(
    payload: SessionCreate,
    service: SessionService = Depends(get_session_service),
) -> Session:
    return service.create_session(payload)


@router.get("/{session_id}", response_model=Session, status_code=200)
def get_session(
    session_id: str,
    service: SessionService = Depends(get_session_service),
) -> Session:
    session = service.get_session(session_id)
    if not session:
        raise SessionNotFoundError(session_id)
    return session


@router.post("/{session_id}/end", response_model=Session)
def end_session(
    session_id: str,
    payload: Optional[SessionEndRequest] = None,
    service: SessionService = Depends(get_session_service),
) -> Session:
    return service.end_session(session_id, payload)


@router.get("/{session_id}/events", response_model=List[ScreenEvent], status_code=200)
def get_session_events(
    session_id: str,
    service: SessionService = Depends(get_session_service),
) -> List[ScreenEvent]:
    session = service.get_session(session_id)
    if not session:
        raise SessionNotFoundError(session_id)
    return service.get_screen_events(session_id)


@router.get("/{session_id}/answers", response_model=List[ExpertAnswer], status_code=200)
def get_session_answers(
    session_id: str,
    service: SessionService = Depends(get_session_service),
) -> List[ExpertAnswer]:
    session = service.get_session(session_id)
    if not session:
        raise SessionNotFoundError(session_id)
    return service.get_expert_answers(session_id)
