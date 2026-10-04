from fastapi import APIRouter, Depends
from backend.models.workmap import WorkMap, WorkMapGenerateRequest
from backend.services.session_service import SessionService

router = APIRouter(prefix="/api/work-maps", tags=["workmaps"])


def get_session_service() -> SessionService:
    return SessionService()


@router.post("/generate", response_model=WorkMap, status_code=200)
def generate_work_map(
    payload: WorkMapGenerateRequest,
    service: SessionService = Depends(get_session_service),
) -> WorkMap:
    return service.generate_work_map(payload)


@router.get("/{work_map_id}", response_model=WorkMap, status_code=200)
def get_work_map(
    work_map_id: str,
    service: SessionService = Depends(get_session_service),
) -> WorkMap:
    return service.get_work_map(work_map_id)
