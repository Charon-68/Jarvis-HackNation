from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from backend.models.errors import IntegrationError
from backend.storage.repository import SessionNotFoundError, WorkMapNotFoundError
from workmap.validator import WorkMapValidationError


def setup_error_handlers(app):
    @app.exception_handler(SessionNotFoundError)
    async def session_not_found_handler(request: Request, exc: SessionNotFoundError):
        error = IntegrationError(
            code="SESSION_NOT_FOUND",
            message=str(exc),
            retryable=False,
            requestId=request.headers.get("X-Request-ID"),
        )
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=error.model_dump(by_alias=True),
        )

    @app.exception_handler(WorkMapNotFoundError)
    async def workmap_not_found_handler(request: Request, exc: WorkMapNotFoundError):
        error = IntegrationError(
            code="WORKMAP_NOT_FOUND",
            message=str(exc),
            retryable=False,
            requestId=request.headers.get("X-Request-ID"),
        )
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=error.model_dump(by_alias=True),
        )

    @app.exception_handler(WorkMapValidationError)
    async def workmap_validation_handler(request: Request, exc: WorkMapValidationError):
        error = IntegrationError(
            code=exc.code,
            message=exc.message,
            retryable=False,
            requestId=request.headers.get("X-Request-ID"),
        )
        return JSONResponse(
            status_code=422,
            content=error.model_dump(by_alias=True),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        details = exc.errors()
        first_msg = details[0]["msg"] if details else "Validation error"
        field_path = ".".join(str(x) for x in details[0]["loc"]) if details else ""
        msg = f"Invalid payload field '{field_path}': {first_msg}" if field_path else first_msg

        error = IntegrationError(
            code="INVALID_REQUEST",
            message=msg,
            retryable=False,
            requestId=request.headers.get("X-Request-ID"),
        )
        return JSONResponse(
            status_code=422,
            content=error.model_dump(by_alias=True),
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        error = IntegrationError(
            code="INTERNAL_SERVER_ERROR",
            message=str(exc) or "An internal error occurred",
            retryable=True,
            requestId=request.headers.get("X-Request-ID"),
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error.model_dump(by_alias=True),
        )
