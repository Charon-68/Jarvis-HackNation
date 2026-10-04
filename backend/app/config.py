import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    PROJECT_NAME: str = "AI Apprentice Backend"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DATABASE_PATH: str = os.getenv(
        "DATABASE_PATH", str(Path(__file__).parent.parent / "apprentice.db")
    )
    CORS_ORIGINS: list[str] = ["*"]


settings = Settings()
