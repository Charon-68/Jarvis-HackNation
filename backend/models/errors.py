from typing import Optional
from pydantic import BaseModel, Field


class IntegrationError(BaseModel):
    code: str
    message: str
    retryable: bool = False
    requestId: Optional[str] = Field(default=None, alias="requestId")

    model_config = {
        "populate_by_name": True,
        "serialize_by_alias": True,
    }
