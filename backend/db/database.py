import os
import sqlite3
from typing import Optional

DB_PATH = os.environ.get(
    "FINSIGHT_DB_PATH",
    os.path.join(os.path.dirname(__file__), "..", "finsight.db"),
)


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                name          TEXT    NOT NULL,
                email         TEXT    UNIQUE NOT NULL,
                password_hash TEXT    NOT NULL,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT    NOT NULL,
                user_id    INTEGER,
                role       TEXT    NOT NULL,
                content    TEXT    NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_user    ON messages(user_id)")
        conn.commit()


def save_message(session_id: str, role: str, content: str, user_id: Optional[int]) -> None:
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO messages (session_id, user_id, role, content) VALUES (?, ?, ?, ?)",
            (session_id, user_id, role, content),
        )
        conn.commit()


def session_owner(session_id: str) -> Optional[int]:
    """Return the user_id that first wrote to this session, or None if anonymous / unknown."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT user_id FROM messages WHERE session_id = ? ORDER BY id ASC LIMIT 1",
            (session_id,),
        ).fetchone()
    return row["user_id"] if row and row["user_id"] is not None else None


def load_messages(session_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT role, content, created_at FROM messages "
            "WHERE session_id = ? ORDER BY id ASC",
            (session_id,),
        ).fetchall()
    return [dict(r) for r in rows]
