from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api import answers, events, sessions, training, workmaps
from backend.app.config import settings
from backend.app.errors import setup_error_handlers
from backend.storage.database import get_db_connection, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_error_handlers(app)

app.include_router(sessions.router)
app.include_router(events.router)
app.include_router(answers.router)
app.include_router(workmaps.router)
app.include_router(training.router)


@app.get("/health", tags=["health"])
def health_check():
    try:
        conn = get_db_connection()
        conn.cursor().execute("SELECT 1;")
        conn.close()
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "degraded", "db_error": str(e)}
