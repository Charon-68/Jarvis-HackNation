import sqlite3
from pathlib import Path
from backend.app.config import settings


def get_db_connection(db_path: str | None = None) -> sqlite3.Connection:
    path = db_path or settings.DATABASE_PATH
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: str | None = None) -> None:
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            mode TEXT NOT NULL,
            phase TEXT NOT NULL,
            workflow_name TEXT NOT NULL,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            expert_name TEXT,
            trainee_name TEXT,
            agent_conversation_id TEXT,
            work_map_id TEXT
        );
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS screen_events (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            timestamp_ms INTEGER NOT NULL,
            ticket_id TEXT NOT NULL,
            type TEXT NOT NULL,
            description TEXT NOT NULL,
            previous_value TEXT,
            new_value TEXT,
            screenshot_ref TEXT,
            source TEXT,
            confidence REAL,
            FOREIGN KEY (session_id) REFERENCES sessions (id)
        );
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS expert_answers (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            timestamp_ms INTEGER NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            phase TEXT NOT NULL,
            related_event_id TEXT,
            related_event_ids_json TEXT,
            FOREIGN KEY (session_id) REFERENCES sessions (id)
        );
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS work_maps (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions (id)
        );
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS decision_attempts (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            ticket_id TEXT NOT NULL,
            timestamp_ms INTEGER NOT NULL,
            priority TEXT,
            team TEXT,
            action TEXT,
            submitted INTEGER NOT NULL,
            allow_save INTEGER NOT NULL,
            intervention_json TEXT,
            FOREIGN KEY (session_id) REFERENCES sessions (id)
        );
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS training_results (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions (id)
        );
        """
    )

    conn.commit()
    conn.close()
